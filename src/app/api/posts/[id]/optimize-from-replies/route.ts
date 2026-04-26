import { NextResponse } from "next/server";
import { rewriteContentWithAi } from "@/lib/ai/gateway";
import { inferBestScheduleTime } from "@/lib/automation/autopilot-timing";
import { buildAccountStyleMemory } from "@/lib/ai/style-memory";
import { prisma } from "@/lib/prisma";
import { getPlatformAdapter } from "@/lib/platforms";
import { z } from "zod";

const optimizeSchema = z.object({
  mode: z.enum(["draft", "scheduled"]).optional().default("draft")
});

function buildReplyOptimizationPrompt(input: {
  originalText: string;
  replies: Array<{ username: string; text: string }>;
}) {
  const replyBlock = input.replies
    .slice(0, 8)
    .map((reply, index) => `${index + 1}. @${reply.username}: ${reply.text}`)
    .join("\n");

  return [
    "這是一篇已發佈的 Threads，現在要根據留言訊號，寫出一篇更適合二次發布的優化版 follow-up。",
    "請保留原本的核心主題，但優先回應留言裡最常出現的疑問、反對點、需求或延伸角度。",
    "新版本要更像一篇獨立可發的 Threads，不要寫成回覆留言摘要。",
    "如果留言透露讀者想看案例、步驟、工具比較或立場更鮮明的版本，請直接反映在新稿裡。",
    "",
    "原始 Threads：",
    input.originalText,
    "",
    "留言樣本：",
    replyBlock
  ].join("\n");
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const payload = optimizeSchema.parse(await _request.json().catch(() => ({})));
    const [settings, post] = await Promise.all([
      prisma.appSettings.findFirst(),
      prisma.post.findUnique({
        where: { id },
        include: {
          account: {
            include: {
              posts: {
                where: {
                  status: "published",
                  publishedAt: {
                    not: null
                  }
                },
                orderBy: {
                  publishedAt: "desc"
                },
                take: 18,
                include: {
                  metrics: {
                    orderBy: {
                      capturedAt: "desc"
                    },
                    take: 1
                  }
                }
              }
            }
          }
        }
      })
    ]);

    if (!post || post.account.platform !== "threads" || !post.platformPostId) {
      return NextResponse.json({ ok: false, message: "這篇內容目前不能做留言優化。" }, { status: 400 });
    }

    const replies = await getPlatformAdapter("threads").getPostReplies(post.accountId, post.platformPostId);
    const meaningfulReplies = replies.filter((reply) => reply.text.trim().length > 0);

    if (!meaningfulReplies.length) {
      return NextResponse.json({ ok: false, message: "目前還抓不到可用留言，先等這篇有更多回覆再試。" }, { status: 400 });
    }

    const styleMemory = await buildAccountStyleMemory(post.accountId);
    const personaPrompt = [
      post.account.personaLabel?.trim() ? `帳號人設：${post.account.personaLabel.trim()}` : "",
      post.account.personaPrompt?.trim() || "",
      post.account.defaultTone?.trim() ? `預設語氣：${post.account.defaultTone.trim()}` : "",
      post.account.topicFocus?.trim() ? `題材範圍：${post.account.topicFocus.trim()}` : "",
      post.account.hookStyle?.trim() ? `Hook 風格：${post.account.hookStyle.trim()}` : "",
      post.account.ctaStyle?.trim() ? `CTA 風格：${post.account.ctaStyle.trim()}` : "",
      post.account.voiceGuardrails?.trim() ? `語氣禁區：${post.account.voiceGuardrails.trim()}` : "",
      settings?.globalPersonaPrompt?.trim() || "",
      styleMemory
    ]
      .filter(Boolean)
      .join("\n\n");

    const result = await rewriteContentWithAi({
      title: `${post.account.personaLabel || post.account.platformUsername} 留言優化 follow-up`,
      rawText: buildReplyOptimizationPrompt({
        originalText: post.textContent ?? post.title ?? "",
        replies: meaningfulReplies.slice(0, 8).map((reply) => ({
          username: reply.username,
          text: reply.text
        }))
      }),
      personaPrompt,
      tone: post.account.defaultTone?.trim() || settings?.defaultTone?.trim() || "sharp-observer",
      preferredProvider: (settings?.aiProvider?.trim() as "auto" | "gemini" | "claude" | "openai") || "auto"
    });

    const timingSuggestion =
      payload.mode === "scheduled"
        ? inferBestScheduleTime({
            goal: post.account.autoGenerateGoal,
            posts: post.account.posts.map((publishedPost) => ({
              publishedAt: publishedPost.publishedAt,
              metrics: publishedPost.metrics.map((metric) => ({
                views: metric.views,
                likes: metric.likes,
                replies: metric.replies,
                reposts: metric.reposts,
                quotes: metric.quotes,
                shares: metric.shares
              }))
            }))
          })
        : null;

    const draft = await prisma.post.create({
      data: {
        userId: post.userId,
        accountId: post.accountId,
        contentType: "text",
        title: result.summary.slice(0, 120),
        textContent: result.threadsDraft,
        status: payload.mode === "scheduled" ? "scheduled" : "draft",
        scheduledAt: payload.mode === "scheduled" ? timingSuggestion?.scheduledAt ?? new Date(Date.now() + 60 * 1000) : null,
        isAutoGenerated: true,
        topicTag: `reply-opt:${post.id}:${Date.now()}`,
        replyToPostId: post.id
      }
    });

    await prisma.automationLog.create({
      data: {
        accountId: post.accountId,
        postId: draft.id,
        actionType: "reply_signal_rewrite",
        status: payload.mode === "scheduled" ? "scheduled" : "draft",
        detail:
          payload.mode === "scheduled"
            ? `已根據 ${meaningfulReplies.length} 則留言生成 follow-up，並排程到 ${timingSuggestion?.label ?? "即刻"}。Provider: ${result.provider}`
            : `已根據 ${meaningfulReplies.length} 則留言生成優化版草稿。Provider: ${result.provider}`
      }
    }).catch(() => null);

    return NextResponse.json({
      ok: true,
      draftId: draft.id,
      mode: payload.mode,
      provider: result.provider,
      replyCount: meaningfulReplies.length,
      scheduledForLabel: timingSuggestion?.label ?? null,
      scheduledAt: draft.scheduledAt?.toISOString() ?? null
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "留言優化草稿建立失敗"
      },
      { status: 400 }
    );
  }
}
