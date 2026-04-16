import { prisma } from "@/lib/prisma";
import { rewriteContentWithAi } from "@/lib/ai/gateway";
import { extractContentFromUrl } from "@/lib/content/url-ingest";
import { buildTemplateHtml } from "@/lib/content/wordpress-templates";

type IngestionInput = {
  sourceType: "url" | "text" | "image";
  sourceUrl?: string;
  title?: string;
  rawText?: string;
  imageUrls?: string[];
  threadsAccountId?: string;
  wordpressTemplate?: "opinion" | "case-study" | "tool-review" | "weekly-recap";
};

type GeneratedDraftSummary = {
  id: string;
  platform: "threads" | "wordpress";
  title: string;
  status: "draft";
};

function stripText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function summarizeSource(title: string, rawText: string) {
  const base = stripText(`${title}\n${rawText}`);
  return base.slice(0, 1200);
}

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

function buildThreadsDraft(summary: string, personaPrompt: string, tone: string) {
  const intro = tone === "mystic-guide" ? "先說結論：" : "我看到一個很值得拆解的點：";
  const perspective = personaPrompt ? `\n視角：${personaPrompt.slice(0, 80)}` : "";
  const body = `${intro}\n\n${summary.slice(0, 340)}${perspective}\n\n如果把這件事拆成行動，大概有三步。`;
  return body.slice(0, 500);
}

function buildWordPressDraft(
  title: string,
  summary: string,
  personaPrompt: string,
  templateId: IngestionInput["wordpressTemplate"],
  affiliatePolicy: string,
  affiliateLibrary: {
    primary: string;
    secondary: string;
    disclosure: string;
    cta: string;
  }
) {
  const heading = title || "內容重寫草稿";
  const paragraphs = summary
    .split(/(?<=[。！？.!?])\s+/)
    .filter(Boolean)
    .slice(0, 8)
    .map((line) => line.trim());
  const points = summary
    .split(/(?<=[。！？.!?])\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((line) => line.trim());

  return {
    title: heading,
    excerpt: summary.slice(0, 140),
    html: buildTemplateHtml({
      templateId,
      title: heading,
      summary,
      paragraphs,
      points,
      affiliatePolicy,
      personaPrompt,
      affiliateLibrary
    })
  };
}

export async function ingestAndGenerateDrafts(input: IngestionInput) {
  const user = await prisma.user.upsert({
    where: { id: "seed-admin" },
    update: {},
    create: {
      id: "seed-admin",
      name: "Admin"
    }
  });

  const settings = await prisma.appSettings.findFirst();
  const affiliatePolicy = settings?.affiliateLinkPolicy?.trim() || "";
  const affiliateLibrary = {
    primary: settings?.affiliateBlockPrimary?.trim() || "",
    secondary: settings?.affiliateBlockSecondary?.trim() || "",
    disclosure: settings?.affiliateDisclosure?.trim() || "",
    cta: settings?.affiliateCta?.trim() || ""
  };
  const preferredProvider = (settings?.aiProvider?.trim() as "auto" | "gemini" | "claude" | "openai" | undefined) || "auto";

  const [threadsAccount, wordpressAccount] = await Promise.all([
    input.threadsAccountId
      ? prisma.platformAccount.findFirst({
          where: { id: input.threadsAccountId, userId: user.id, platform: "threads", isActive: true }
        })
      : prisma.platformAccount.findFirst({
          where: { userId: user.id, platform: "threads", isActive: true },
          orderBy: [{ lastSyncedAt: "desc" }, { createdAt: "desc" }]
        }),
    prisma.platformAccount.findFirst({
      where: { userId: user.id, platform: "wordpress", isActive: true },
      orderBy: [{ lastSyncedAt: "desc" }, { createdAt: "desc" }]
    })
  ]);

  if (!threadsAccount && !wordpressAccount) {
    throw new Error("至少需要先連接一個 Threads 或 WordPress 帳號，才能生成草稿。");
  }

  const personaPrompt = [
    threadsAccount ? buildPersonaPlaybook(threadsAccount) : "",
    settings?.globalPersonaPrompt?.trim() || "用冷靜、有觀點、像內容策略師一樣的語氣，幫我拆解重點。",
    settings?.writingStyleProfile?.trim() ? `寫作風格基底：${settings.writingStyleProfile.trim()}` : "",
    settings?.affiliateLinkPolicy?.trim() ? `聯盟與推廣連結策略：${settings.affiliateLinkPolicy.trim()}` : ""
  ]
    .filter(Boolean)
    .join("\n\n");
  const tone = threadsAccount?.defaultTone?.trim() || settings?.defaultTone?.trim() || "sharp-observer";

  const sourceUrl = input.sourceUrl?.trim();
  let extractedTitle = "";
  let extractedText = "";
  let extractedExcerpt = "";
  let sourceNote = "";

  if (input.sourceType === "url" && sourceUrl) {
    try {
      const extracted = await extractContentFromUrl(sourceUrl);
      extractedTitle = extracted.title;
      extractedText = extracted.text;
      extractedExcerpt = extracted.excerpt;
      sourceNote = `URL import: ${extracted.sourceLabel} | Resolved: ${extracted.resolvedUrl}`;
    } catch (error) {
      sourceNote = error instanceof Error ? `URL import fallback: ${error.message}` : "URL import fallback";
    }
  }

  const safeTitle = input.title?.trim() || extractedTitle || "未命名素材";
  const safeText = input.rawText?.trim() || extractedText || sourceUrl || "沒有附上文字內容";
  const summary = summarizeSource(safeTitle, safeText);
  let aiProvider = "fallback";
  let generated = {
    summary,
    threadsDraft: buildThreadsDraft(summary, personaPrompt, tone),
    wordpressTitle: safeTitle,
    wordpressExcerpt: summary.slice(0, 140),
    wordpressHtml: buildWordPressDraft(
      safeTitle,
      summary,
      personaPrompt,
      input.wordpressTemplate,
      affiliatePolicy,
      affiliateLibrary
    ).html
  };

  try {
    const aiResult = await rewriteContentWithAi({
      title: safeTitle,
      rawText: safeText,
      personaPrompt,
      tone,
      wordpressTemplate: input.wordpressTemplate,
      preferredProvider
    });

    aiProvider = aiResult.provider;
    generated = {
      summary: aiResult.summary,
      threadsDraft: aiResult.threadsDraft,
      wordpressTitle: aiResult.wordpressTitle,
      wordpressExcerpt: aiResult.wordpressExcerpt || extractedExcerpt || summary.slice(0, 140),
      wordpressHtml: aiResult.wordpressHtml
    };
  } catch {}

  const generatedPostIds: string[] = [];
  const generatedDrafts: GeneratedDraftSummary[] = [];

  const ingestion = await prisma.ingestionRecord.create({
    data: {
      userId: user.id,
      sourceType: input.sourceType,
      sourceUrl: input.sourceUrl ?? null,
      title: safeTitle,
      rawText: safeText,
      imageUrls: input.imageUrls?.length ? JSON.stringify(input.imageUrls) : null,
      status: "processed",
      notes: `Persona: ${personaPrompt.slice(0, 120)} | Provider: ${aiProvider}${sourceNote ? ` | ${sourceNote}` : ""}`
    }
  });

  if (threadsAccount) {
    const threadsDraft = await prisma.post.create({
      data: {
        userId: user.id,
        accountId: threadsAccount.id,
        contentType: "text",
        textContent: generated.threadsDraft,
        mediaUrls: input.imageUrls?.length ? JSON.stringify(input.imageUrls.slice(0, 1)) : null,
        status: "draft"
      }
    });
    generatedPostIds.push(threadsDraft.id);
    generatedDrafts.push({
      id: threadsDraft.id,
      platform: "threads",
      title: generated.threadsDraft.slice(0, 72),
      status: "draft"
    });
  }

  if (wordpressAccount) {
    const wordpressDraft = await prisma.post.create({
      data: {
        userId: user.id,
        accountId: wordpressAccount.id,
        contentType: "text",
        title: generated.wordpressTitle,
        textContent: generated.wordpressExcerpt,
        htmlContent: generated.wordpressHtml,
        excerpt: generated.wordpressExcerpt,
        featuredImageUrl: input.imageUrls?.[0] ?? null,
        status: "draft"
      }
    });
    generatedPostIds.push(wordpressDraft.id);
    generatedDrafts.push({
      id: wordpressDraft.id,
      platform: "wordpress",
      title: generated.wordpressTitle,
      status: "draft"
    });
  }

  await prisma.ingestionRecord.update({
    where: { id: ingestion.id },
    data: {
      generatedPostIds: JSON.stringify(generatedPostIds)
    }
  });

  return {
    ingestionId: ingestion.id,
    generatedPostIds,
    generatedDrafts,
    provider: aiProvider
  };
}
