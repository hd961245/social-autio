import { NextResponse } from "next/server";
import { z } from "zod";
import { rewriteContentWithAi } from "@/lib/ai/gateway";
import { fetchWordPressPostById } from "@/lib/platforms/wordpress/client";
import { prisma } from "@/lib/prisma";

const rewriteSchema = z.object({
  accountId: z.string().min(1),
  remotePostId: z.union([z.number().int().positive(), z.string().min(1)])
});

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(request: Request) {
  try {
    const payload = rewriteSchema.parse(await request.json());
    const user = await prisma.user.upsert({
      where: { id: "seed-admin" },
      update: {},
      create: {
        id: "seed-admin",
        name: "Admin"
      }
    });

    const [settings, account, sourcePost] = await Promise.all([
      prisma.appSettings.findFirst(),
      prisma.platformAccount.findUnique({
        where: { id: payload.accountId }
      }),
      fetchWordPressPostById(payload.accountId, payload.remotePostId)
    ]);

    if (!account || account.platform !== "wordpress") {
      return NextResponse.json({ ok: false, message: "找不到指定的 WordPress 帳號。" }, { status: 404 });
    }

    const title = stripHtml(sourcePost.title?.rendered ?? "") || "未命名文章";
    const excerpt = stripHtml(sourcePost.excerpt?.rendered ?? "");
    const content = stripHtml(sourcePost.content?.rendered ?? "");

    if (!content) {
      return NextResponse.json({ ok: false, message: "原始文章沒有可複寫的內容。" }, { status: 400 });
    }

    const personaPrompt = [
      settings?.globalPersonaPrompt?.trim() || "用冷靜、有觀點、像內容策略師一樣的語氣，幫我拆解重點。",
      settings?.writingStyleProfile?.trim() ? `寫作風格基底：${settings.writingStyleProfile.trim()}` : "",
      settings?.affiliateLinkPolicy?.trim() ? `聯盟與推廣連結策略：${settings.affiliateLinkPolicy.trim()}` : "",
      "請不要直接改寫成近似同義版本，而是保留核心主題，換一個更適合再次發布的新切角。",
      "輸出的 WordPress 草稿要保留可插入聯盟連結、導購段落與 CTA 的空間。"
    ]
      .filter(Boolean)
      .join("\n\n");

    const preferredProvider = (settings?.aiProvider?.trim() as "auto" | "gemini" | "claude" | "openai" | undefined) ?? "auto";
    const aiResult = await rewriteContentWithAi({
      title,
      rawText: `原始文章標題：${title}\n\n摘要：${excerpt}\n\n原始文章內容：${content}`,
      personaPrompt,
      tone: settings?.defaultTone?.trim() || "sharp-observer",
      preferredProvider
    });

    const draft = await prisma.post.create({
      data: {
        userId: user.id,
        accountId: account.id,
        contentType: "text",
        title: aiResult.wordpressTitle || `${title}｜重寫版`,
        textContent: aiResult.wordpressExcerpt,
        htmlContent: aiResult.wordpressHtml,
        excerpt: aiResult.wordpressExcerpt,
        status: "draft",
        errorMessage: null
      }
    });

    return NextResponse.json({
      ok: true,
      postId: draft.id,
      title: draft.title,
      message: "已根據既有文章建立新的 WordPress 草稿。"
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Rewrite from post failed"
      },
      { status: 400 }
    );
  }
}
