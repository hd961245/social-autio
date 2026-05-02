import { NextResponse } from "next/server";
import { rewriteContentWithAi } from "@/lib/ai/gateway";
import { buildAccountStyleMemory } from "@/lib/ai/style-memory";
import { buildEditorialMemoryPrompt, findEditorialPresetBySiteUrl } from "@/lib/content/editorial-presets";
import { extractContentFromUrl } from "@/lib/content/url-ingest";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

type ComposeAiDraftInput = {
  accountId?: string;
  sourceType?: "text" | "url";
  sourceUrl?: string;
  title?: string;
  rawText?: string;
  brief?: string;
  goal?: string;
  optimizeFor?: string;
  provider?: "auto" | "gemini" | "claude" | "openai";
  wordpressTemplate?: "opinion" | "case-study" | "tool-review" | "weekly-recap";
  createDraft?: boolean;
  sourcePostId?: string;
};

function buildPersonaPlaybook(account: {
  personaLabel?: string | null;
  personaPrompt?: string | null;
  defaultTone?: string | null;
  topicFocus?: string | null;
  hookStyle?: string | null;
  ctaStyle?: string | null;
  voiceGuardrails?: string | null;
}) {
  return [
    account.personaLabel?.trim() ? `帳號人設：${account.personaLabel.trim()}` : "",
    account.personaPrompt?.trim() ? account.personaPrompt.trim() : "",
    account.defaultTone?.trim() ? `預設語氣：${account.defaultTone.trim()}` : "",
    account.topicFocus?.trim() ? `題材範圍：${account.topicFocus.trim()}` : "",
    account.hookStyle?.trim() ? `Hook 風格：${account.hookStyle.trim()}` : "",
    account.ctaStyle?.trim() ? `CTA 風格：${account.ctaStyle.trim()}` : "",
    account.voiceGuardrails?.trim() ? `語氣禁區：${account.voiceGuardrails.trim()}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

function getAiDiagnostics() {
  return {
    openai: Boolean(env.openaiApiKey()),
    gemini: Boolean(env.geminiApiKey()),
    claude: Boolean(env.anthropicApiKey())
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ComposeAiDraftInput;
    const accountId = body.accountId?.trim();

    if (!accountId) {
      return NextResponse.json({ ok: false, message: "請先選一個發布帳號，再用 AI 起稿。" }, { status: 400 });
    }

    const sourceType = body.sourceType === "url" ? "url" : "text";
    const sourceUrl = body.sourceUrl?.trim() || "";
    const rawText = body.rawText?.trim() || "";
    const rawTitle = body.title?.trim() || "";
    const brief = body.brief?.trim() || "";
    const goal = body.goal?.trim() || "";
    const optimizeFor = body.optimizeFor?.trim() || "";

    if (sourceType === "url" && !sourceUrl) {
      return NextResponse.json({ ok: false, message: "網址模式需要先貼一個公開連結。" }, { status: 400 });
    }

    if (sourceType === "text" && !rawText && !brief) {
      return NextResponse.json({ ok: false, message: "至少給一段素材，或直接告訴 AI 你想寫的方向。" }, { status: 400 });
    }

    const user = await prisma.user.upsert({
      where: { id: "seed-admin" },
      update: {},
      create: {
        id: "seed-admin",
        name: "Admin"
      }
    });

    const [account, settings] = await Promise.all([
      prisma.platformAccount.findFirst({
        where: {
          id: accountId,
          userId: user.id,
          isActive: true
        }
      }),
      prisma.appSettings.findFirst()
    ]);

    if (!account) {
      return NextResponse.json({ ok: false, message: "目前找不到這個帳號，請重新整理後再試。" }, { status: 404 });
    }

    const wordpressSite =
      account.platform === "wordpress"
        ? account
        : await prisma.platformAccount.findFirst({
            where: {
              userId: account.userId,
              platform: "wordpress",
              isActive: true
            },
            orderBy: [{ lastSyncedAt: "desc" }, { createdAt: "desc" }]
          });

    let safeTitle = rawTitle;
    let safeText = rawText;
    let sourceLabel = sourceType === "url" ? "URL import" : "純文字素材";
    let resolvedUrl = sourceUrl;

    if (sourceType === "url") {
      const extracted = await extractContentFromUrl(sourceUrl);
      safeTitle = safeTitle || extracted.title || "未命名素材";
      safeText = safeText || extracted.text || extracted.excerpt || sourceUrl;
      sourceLabel = extracted.sourceLabel;
      resolvedUrl = extracted.resolvedUrl;
    }

    if (!safeTitle) {
      safeTitle = "未命名素材";
    }

    const directionContext = [brief ? `這次想寫的方向：${brief}` : "", goal ? `希望達成的效果：${goal}` : "", optimizeFor ? `優化重點：${optimizeFor}` : ""]
      .filter(Boolean)
      .join("\n");

    if (directionContext) {
      safeText = [directionContext, safeText].filter(Boolean).join("\n\n");
    }

    if (!safeText) {
      return NextResponse.json({ ok: false, message: "這份素材目前抓不到可改寫內容。" }, { status: 400 });
    }

    const styleMemory = await buildAccountStyleMemory(account.id, {
      concise: account.platform === "threads"
    });
    const editorialSiteUrl = wordpressSite?.platformUserId;
    const preset = findEditorialPresetBySiteUrl(editorialSiteUrl);
    const personaPrompt = [
      buildPersonaPlaybook(account),
      buildEditorialMemoryPrompt({
        siteUrl: editorialSiteUrl,
        globalPersonaPrompt: settings?.globalPersonaPrompt,
        writingStyleProfile: settings?.writingStyleProfile,
        affiliateLinkPolicy: settings?.affiliateLinkPolicy,
        concise: account.platform === "threads"
      }) || "用冷靜、有觀點、像內容策略師一樣的語氣，幫我拆解重點。",
      styleMemory
    ]
      .filter(Boolean)
      .join("\n\n");

    const tone = account.defaultTone?.trim() || settings?.defaultTone?.trim() || preset?.defaultTone || "sharp-observer";
    const provider = body.provider || (settings?.aiProvider?.trim() as ComposeAiDraftInput["provider"]) || "auto";
    const diagnostics = getAiDiagnostics();

    const result = await rewriteContentWithAi({
      title: safeTitle,
      rawText: safeText,
      personaPrompt,
      tone,
      siteUrl: editorialSiteUrl,
      wordpressTemplate: body.wordpressTemplate || "opinion",
      preferredProvider: provider
    });

    let createdDraftId: string | null = null;

    if (body.createDraft && account.platform === "threads") {
      const post = await prisma.post.create({
        data: {
          userId: user.id,
          accountId: account.id,
          contentType: "text",
          title: result.summary.slice(0, 120),
          textContent: result.threadsDraft,
          excerpt: brief || result.summary,
          topicTag: "opinion",
          status: "draft",
          isAutoGenerated: true,
          replyToPostId: body.sourcePostId?.trim() || null
        }
      });
      createdDraftId = post.id;
    }

    return NextResponse.json({
      ok: true,
      provider: result.provider,
      requestedProvider: provider,
      availableProviders: diagnostics,
      sourceLabel,
      resolvedUrl,
      postId: createdDraftId,
      draft: {
        summary: result.summary,
        threadsDraft: result.threadsDraft,
        wordpressTitle: result.wordpressTitle,
        wordpressExcerpt: result.wordpressExcerpt,
        wordpressHtml: result.wordpressHtml
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 起稿失敗";
    return NextResponse.json(
      {
        ok: false,
        message,
        availableProviders: getAiDiagnostics()
      },
      { status: 500 }
    );
  }
}
