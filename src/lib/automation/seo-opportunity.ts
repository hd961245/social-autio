import { rewriteContentWithAi } from "@/lib/ai/gateway";
import { inferBestScheduleTime } from "@/lib/automation/autopilot-timing";
import { buildEditorialMemoryPrompt, findEditorialPresetBySiteUrl } from "@/lib/content/editorial-presets";
import { buildTemplateHtml, inferWordPressDraftPlanning } from "@/lib/content/wordpress-templates";
import { type GscOpportunity, getGscOpportunityQueue } from "@/lib/gsc";
import { publishToWordPress } from "@/lib/platforms/wordpress/publisher";
import { prisma } from "@/lib/prisma";

type ProcessMode = "manual" | "autopilot";

type OpportunityRoute = "observed" | "review" | "draft" | "published";

type ProcessResult = {
  ok: boolean;
  route: OpportunityRoute;
  title?: string;
  postId?: string;
  href?: string;
  published?: boolean;
  skipped?: boolean;
  message: string;
};

type SeoOpportunityInput = Pick<GscOpportunity, "page" | "query" | "lane" | "confidence" | "reason" | "action">;

function buildParagraphs(summary: string) {
  return summary
    .split(/(?<=[。！？.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function slugifyOpportunity(parts: Array<string | undefined>) {
  return parts
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
}

function buildOpportunityTag(opportunity: Pick<SeoOpportunityInput, "page" | "query" | "lane">) {
  return `seo-opportunity|${opportunity.lane}|${slugifyOpportunity([opportunity.query, opportunity.page]) || "untitled"}`;
}

function getOpportunityDecision(input: {
  confidence: GscOpportunity["confidence"];
  autopilotMode?: string | null;
  wordpressPublishMode?: string | null;
  mode: ProcessMode;
}) {
  if (input.mode === "autopilot" && input.confidence === "low") {
    return {
      route: "observed" as const,
      shouldCreateDraft: false,
      shouldPublish: false
    };
  }

  if (input.confidence === "high") {
    if (input.wordpressPublishMode === "auto_publish" && input.autopilotMode === "near_full_auto") {
      return {
        route: "published" as const,
        shouldCreateDraft: true,
        shouldPublish: true
      };
    }

    return {
      route: input.mode === "manual" ? ("draft" as const) : ("review" as const),
      shouldCreateDraft: true,
      shouldPublish: false
    };
  }

  return {
    route: "review" as const,
    shouldCreateDraft: true,
    shouldPublish: false
  };
}

export async function processSeoOpportunity(opportunity: SeoOpportunityInput, mode: ProcessMode = "manual"): Promise<ProcessResult> {
  const opportunityTag = buildOpportunityTag(opportunity);
  const user = await prisma.user.upsert({
    where: { id: "seed-admin" },
    update: {},
    create: {
      id: "seed-admin",
      name: "Admin"
    }
  });

  const [settings, wordpressAccount] = await Promise.all([
    prisma.appSettings.findFirst(),
    prisma.platformAccount.findFirst({
      where: {
        userId: user.id,
        platform: "wordpress",
        isActive: true
      },
      orderBy: [{ lastSyncedAt: "desc" }, { createdAt: "desc" }]
    })
  ]);

  if (!wordpressAccount) {
    return {
      ok: false,
      route: "review",
      message: "目前找不到可用的 WordPress 帳號。"
    };
  }

  const existing = await prisma.post.findFirst({
    where: {
      accountId: wordpressAccount.id,
      topicTag: opportunityTag
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  if (existing) {
    return {
      ok: true,
      route: existing.status === "published" ? "published" : "draft",
      postId: existing.id,
      href: existing.status === "published" ? "/wordpress" : `/compose?postId=${existing.id}`,
      published: existing.status === "published",
      skipped: true,
      message: existing.status === "published" ? "這個 SEO 機會已經自動轉成並發布到 WordPress。" : "這個 SEO 機會已經有對應的 WordPress 草稿。"
    };
  }

  const decision = getOpportunityDecision({
    confidence: opportunity.confidence,
    autopilotMode: settings?.autopilotMode,
    wordpressPublishMode: settings?.wordpressPublishMode,
    mode
  });

  if (!decision.shouldCreateDraft) {
    await prisma.automationLog.create({
      data: {
        accountId: wordpressAccount.id,
        actionType: "seo_opportunity_observed",
        status: "observed",
        detail: `SEO 機會先進觀察池：${opportunity.query ?? opportunity.page}｜${opportunity.reason}`
      }
    });

    return {
      ok: true,
      route: "observed",
      href: "/analytics",
      message: "這個 SEO 機會目前屬於低信心，系統先保留在觀察池，不急著建稿。"
    };
  }

  const titleSeed = opportunity.query?.trim() || opportunity.page.trim();
  const sourceBrief = [
    `目前這個搜尋機會頁：${opportunity.page}`,
    opportunity.query ? `對應查詢：${opportunity.query}` : "",
    `系統判定原因：${opportunity.reason}`,
    `建議動作：${opportunity.action}`,
    opportunity.lane === "refresh"
      ? "請優先產出一篇適合更新既有 WordPress 文章的優化稿，偏向 title / desc / CTA / 開頭重寫與段落重組。"
      : opportunity.lane === "expand"
        ? "請產出一篇適合加長、補 FAQ、補案例與內鏈的 WordPress 優化稿，偏向 SEO 延伸。"
        : "請產出一篇適合新增或重寫承接搜尋意圖的 WordPress 題目稿。"
  ]
    .filter(Boolean)
    .join("\n");

  const siteUrl = wordpressAccount.platformUserId;
  const preset = findEditorialPresetBySiteUrl(siteUrl);
  const personaPrompt =
    buildEditorialMemoryPrompt({
      siteUrl,
      globalPersonaPrompt: settings?.globalPersonaPrompt,
      writingStyleProfile: settings?.writingStyleProfile,
      affiliateLinkPolicy: settings?.affiliateLinkPolicy
    }) || "用冷靜、有觀點、像內容策略師一樣的語氣，幫我把搜尋機會改寫成可更新的長文內容。";
  const preferredProvider = (settings?.aiProvider?.trim() as "auto" | "gemini" | "claude" | "openai" | undefined) ?? "auto";
  const aiResult = await rewriteContentWithAi({
    title: titleSeed,
    rawText: sourceBrief,
    personaPrompt,
    tone: settings?.defaultTone?.trim() || preset?.defaultTone || "sharp-observer",
    siteUrl,
    wordpressTemplate: opportunity.lane === "expand" ? "case-study" : "opinion",
    preferredProvider
  });

  const planning = inferWordPressDraftPlanning({
    title: aiResult.wordpressTitle || `${titleSeed}｜SEO 優化稿`,
    summary: aiResult.summary,
    templateId: opportunity.lane === "expand" ? "case-study" : "opinion"
  });
  const paragraphs = buildParagraphs(aiResult.summary);
  const points = paragraphs.slice(0, 3);
  const html =
    aiResult.wordpressHtml ||
    buildTemplateHtml({
      templateId: opportunity.lane === "expand" ? "case-study" : "opinion",
      title: aiResult.wordpressTitle || `${titleSeed}｜SEO 優化稿`,
      summary: aiResult.summary,
      paragraphs,
      points,
      affiliatePolicy: settings?.affiliateLinkPolicy?.trim() || "",
      personaPrompt,
      affiliateLibrary: {
        primary: settings?.affiliateBlockPrimary?.trim() || "",
        secondary: settings?.affiliateBlockSecondary?.trim() || "",
        disclosure: settings?.affiliateDisclosure?.trim() || "",
        cta: settings?.affiliateCta?.trim() || ""
      },
      planning
    });

  const scheduledAt =
    decision.route === "published" && settings?.autopilotMode === "near_full_auto"
      ? inferBestScheduleTime({
          goal: settings?.editorialGoal,
          posts: []
        }).scheduledAt
      : null;

  const post = await prisma.post.create({
    data: {
      userId: user.id,
      accountId: wordpressAccount.id,
      contentType: "text",
      title: aiResult.wordpressTitle || `${titleSeed}｜SEO 優化稿`,
      textContent: aiResult.wordpressExcerpt || aiResult.summary.slice(0, 180),
      htmlContent: html,
      excerpt: `${opportunity.reason}｜${opportunity.action}`,
      categories: JSON.stringify(["seo-growth", planning.pillar, planning.contentType]),
      tags: JSON.stringify([opportunity.lane, "gsc-opportunity", ...(opportunity.query ? [opportunity.query] : [])]),
      topicTag: opportunityTag,
      status: decision.shouldPublish ? "published" : "draft",
      isAutoGenerated: true,
      scheduledAt
    }
  });

  let href = `/compose?postId=${post.id}`;
  let message = "已根據 Search Console 機會建立 WordPress SEO 優化稿。";

  if (decision.shouldPublish) {
    const result = await publishToWordPress(
      wordpressAccount.id,
      {
        contentType: "text",
        title: post.title ?? titleSeed,
        text: post.textContent ?? aiResult.summary.slice(0, 180),
        html,
        excerpt: post.textContent ?? aiResult.summary.slice(0, 180),
        tags: JSON.parse(post.tags ?? "[]") as string[],
        categories: JSON.parse(post.categories ?? "[]") as string[]
      },
      { status: "publish" }
    );

    await prisma.post.update({
      where: { id: post.id },
      data: {
        status: "published",
        publishedAt: new Date(),
        platformPostId: result.platformPostId,
        platformUrl: result.url ?? null,
        errorMessage: null
      }
    });

    href = "/wordpress";
    message = "這個高信心 SEO 機會已由系統直接發布到 WordPress。";
  } else if (decision.route === "review") {
    href = "/review";
    message = "這個 SEO 機會已先轉成 WordPress 草稿，等你最後拍板。";
  } else {
    message = "這個高信心 SEO 機會已先轉成 WordPress 草稿。";
  }

  await prisma.automationLog.create({
    data: {
      accountId: wordpressAccount.id,
      postId: post.id,
      actionType: decision.shouldPublish ? "seo_opportunity_auto_publish" : "seo_opportunity_draft",
      status: decision.shouldPublish ? "published" : decision.route,
      detail: `${message}｜${opportunity.query ?? opportunity.page}｜${opportunity.reason}`
    }
  });

  return {
    ok: true,
    route: decision.route,
    title: post.title ?? undefined,
    postId: post.id,
    href,
    published: decision.shouldPublish,
    message
  };
}

export async function runSeoOpportunityAutopilot() {
  const settings = await prisma.appSettings.findFirst();

  if (settings?.automationPaused) {
    return {
      checked: 0,
      handled: 0,
      observed: 0,
      skipped: 0,
      failed: 0,
      paused: true
    };
  }

  const queue = await getGscOpportunityQueue();
  if (!queue.configured || !queue.items.length) {
    return {
      checked: 0,
      handled: 0,
      observed: 0,
      skipped: 0,
      failed: 0,
      paused: false
    };
  }

  const candidates = queue.items
    .filter((item) => item.confidence !== "low")
    .slice(0, settings?.autopilotMode === "near_full_auto" ? 2 : 1);

  let handled = 0;
  let observed = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of candidates) {
    try {
      const result = await processSeoOpportunity(item, "autopilot");
      if (result.skipped) {
        skipped += 1;
      } else if (result.route === "observed") {
        observed += 1;
      } else if (result.ok) {
        handled += 1;
      }
    } catch (error) {
      failed += 1;
      await prisma.automationLog.create({
        data: {
          actionType: "seo_opportunity_draft",
          status: "failed",
          detail: error instanceof Error ? error.message : "SEO opportunity autopilot failed"
        }
      });
    }
  }

  return {
    checked: candidates.length,
    handled,
    observed,
    skipped,
    failed,
    paused: false
  };
}
