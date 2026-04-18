import { NextResponse } from "next/server";
import { rewriteContentWithAi } from "@/lib/ai/gateway";
import { extractContentFromUrl } from "@/lib/content/url-ingest";
import { prisma } from "@/lib/prisma";

type ComposeAiDraftInput = {
  accountId?: string;
  sourceType?: "text" | "url";
  sourceUrl?: string;
  title?: string;
  rawText?: string;
  provider?: "auto" | "gemini" | "claude" | "openai";
  wordpressTemplate?: "opinion" | "case-study" | "tool-review" | "weekly-recap";
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

    if (sourceType === "url" && !sourceUrl) {
      return NextResponse.json({ ok: false, message: "網址模式需要先貼一個公開連結。" }, { status: 400 });
    }

    if (sourceType === "text" && !rawText) {
      return NextResponse.json({ ok: false, message: "純文字模式需要先貼一段素材。" }, { status: 400 });
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

    if (!safeText) {
      return NextResponse.json({ ok: false, message: "這份素材目前抓不到可改寫內容。" }, { status: 400 });
    }

    const personaPrompt = [
      buildPersonaPlaybook(account),
      settings?.globalPersonaPrompt?.trim() || "用冷靜、有觀點、像內容策略師一樣的語氣，幫我拆解重點。",
      settings?.writingStyleProfile?.trim() ? `寫作風格基底：${settings.writingStyleProfile.trim()}` : "",
      settings?.affiliateLinkPolicy?.trim() ? `聯盟與推廣連結策略：${settings.affiliateLinkPolicy.trim()}` : ""
    ]
      .filter(Boolean)
      .join("\n\n");

    const tone = account.defaultTone?.trim() || settings?.defaultTone?.trim() || "sharp-observer";
    const provider = body.provider || (settings?.aiProvider?.trim() as ComposeAiDraftInput["provider"]) || "auto";

    const result = await rewriteContentWithAi({
      title: safeTitle,
      rawText: safeText,
      personaPrompt,
      tone,
      wordpressTemplate: body.wordpressTemplate || "opinion",
      preferredProvider: provider
    });

    return NextResponse.json({
      ok: true,
      provider: result.provider,
      sourceLabel,
      resolvedUrl,
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
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
