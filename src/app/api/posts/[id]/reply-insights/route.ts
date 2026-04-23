import { NextResponse } from "next/server";
import { summarizeReplyInsightsWithAi } from "@/lib/ai/gateway";
import { prisma } from "@/lib/prisma";
import { getPlatformAdapter } from "@/lib/platforms";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const [settings, post] = await Promise.all([
      prisma.appSettings.findFirst(),
      prisma.post.findUnique({
        where: { id },
        include: {
          account: true
        }
      })
    ]);

    if (!post || post.account.platform !== "threads" || !post.platformPostId) {
      return NextResponse.json({ ok: false, message: "這篇內容目前不能做留言洞察。" }, { status: 400 });
    }

    const replies = await getPlatformAdapter("threads").getPostReplies(post.accountId, post.platformPostId);
    const meaningfulReplies = replies.filter((reply) => reply.text.trim().length > 0);

    if (!meaningfulReplies.length) {
      return NextResponse.json({ ok: false, message: "目前還抓不到可用留言。"}, { status: 400 });
    }

    const result = await summarizeReplyInsightsWithAi({
      originalText: post.textContent ?? post.title ?? "",
      replies: meaningfulReplies.slice(0, 10).map((reply) => ({
        username: reply.username,
        text: reply.text
      })),
      preferredProvider: (settings?.aiProvider?.trim() as "auto" | "gemini" | "claude" | "openai") || "auto"
    });

    return NextResponse.json({
      ok: true,
      result,
      replyCount: meaningfulReplies.length
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "留言洞察生成失敗"
      },
      { status: 400 }
    );
  }
}
