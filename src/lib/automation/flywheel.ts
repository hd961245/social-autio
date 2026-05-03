import { rewriteContentWithAi } from "@/lib/ai/gateway";
import { inferBestScheduleTime } from "@/lib/automation/autopilot-timing";
import { prisma } from "@/lib/prisma";
import { getPlatformAdapter } from "@/lib/platforms";
import { syncPostToWordPress } from "@/lib/workflows/sync-to-wordpress";

function engagementScore(metric: {
  views: number;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
  shares: number;
}) {
  return metric.views > 0
    ? (metric.likes + metric.replies + metric.reposts + metric.quotes + metric.shares) / metric.views
    : 0;
}

function conversationScore(metric: {
  views: number;
  replies: number;
  quotes: number;
}) {
  return metric.views > 0 ? (metric.replies + metric.quotes) / metric.views : 0;
}

function amplificationScore(metric: {
  views: number;
  reposts: number;
  quotes: number;
  shares: number;
}) {
  return metric.views > 0 ? (metric.reposts + metric.quotes + metric.shares) / metric.views : 0;
}

function isLongformEligible(metric: {
  views: number;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
  shares: number;
}) {
  const engagement = engagementScore(metric);
  const conversation = conversationScore(metric);
  const amplification = amplificationScore(metric);

  return (
    engagement >= 0.06 ||
    conversation >= 0.018 ||
    amplification >= 0.012 ||
    metric.replies >= 8 ||
    metric.views >= 800
  );
}

function getOptimizationConfidence(metric: {
  views: number;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
  shares: number;
}) {
  const engagement = engagementScore(metric);
  const conversation = conversationScore(metric);

  if (engagement >= 0.1 || conversation >= 0.03 || metric.views >= 1500) {
    return "high" as const;
  }

  if (engagement >= 0.05 || conversation >= 0.015 || metric.views >= 600) {
    return "medium" as const;
  }

  return "low" as const;
}

function buildOptimizationAssignment(input: {
  text: string;
  title?: string | null;
  metric: {
    views: number;
    likes: number;
    replies: number;
    reposts: number;
    quotes: number;
    shares: number;
  };
  replies: Array<{ username: string; text: string }>;
}) {
  const replySummary = input.replies.length
    ? input.replies.slice(0, 5).map((reply, index) => `${index + 1}. @${reply.username}: ${reply.text}`).join("\n")
    : "目前沒有足夠留言樣本。";

  return [
    "請把這篇已發布 Threads 貼文優化成下一版可發稿，不要只是改寫，要更像下一輪更成熟的版本。",
    `原始主題：${input.title?.trim() || "未命名主題"}`,
    `原始內容：\n${input.text.trim()}`,
    `表現訊號：views ${input.metric.views} / likes ${input.metric.likes} / replies ${input.metric.replies} / reposts ${input.metric.reposts} / quotes ${input.metric.quotes} / shares ${input.metric.shares}`,
    `留言訊號：\n${replySummary}`,
    "優化目標：讓 hook 更清楚、觀點更集中、結尾 CTA 更自然，而且更適合帶出下一輪回覆或收藏。",
    "請直接輸出一篇新的原生 Threads 版本。"
  ].join("\n\n");
}

export async function runAutoWordPressExpansion(now = new Date()) {
  const settings = await prisma.appSettings.findFirst();

  if (settings?.automationPaused || settings?.autopilotMode === "review_only") {
    return { checked: 0, created: 0, skipped: 0, paused: true };
  }

  const posts = await prisma.post.findMany({
    where: {
      status: "published",
      publishedAt: {
        lte: now
      },
      platformPostId: {
        not: null
      },
      account: {
        platform: "threads"
      }
    },
    include: {
      account: true,
      metrics: {
        orderBy: {
          capturedAt: "desc"
        },
        take: 1
      }
    },
    orderBy: {
      publishedAt: "desc"
    },
    take: 24
  });

  const existingWordPress = await prisma.post.findMany({
    where: {
      account: {
        platform: "wordpress"
      },
      replyToPostId: {
        in: posts.map((post) => post.platformPostId!).filter(Boolean)
      }
    },
    select: {
      replyToPostId: true
    }
  });

  const existingSet = new Set(existingWordPress.map((post) => post.replyToPostId).filter(Boolean));

  let created = 0;
  let skipped = 0;

  for (const post of posts) {
    const sourcePlatformPostId = post.platformPostId;
    const metric = post.metrics[0];

    if (!sourcePlatformPostId || !metric || existingSet.has(sourcePlatformPostId)) {
      skipped += 1;
      continue;
    }

    if (!isLongformEligible(metric)) {
      skipped += 1;
      continue;
    }

    try {
      const result = await syncPostToWordPress(post.id);
      created += result.duplicated ? 0 : 1;
      if (!result.duplicated) {
        await prisma.automationLog.create({
          data: {
            accountId: post.accountId,
            postId: post.id,
            actionType: "auto_wordpress_expansion",
            status: "executed",
            detail: result.published ? "系統已自動把強表現 Threads 擴寫到 WordPress 並發布。" : "系統已自動把強表現 Threads 送進 WordPress 草稿台。"
          }
        });
      }
    } catch (error) {
      await prisma.automationLog.create({
        data: {
          accountId: post.accountId,
          postId: post.id,
          actionType: "auto_wordpress_expansion",
          status: "failed",
          detail: error instanceof Error ? error.message : "Auto WordPress expansion failed"
        }
      });
    }
  }

  return {
    checked: posts.length,
    created,
    skipped,
    paused: false
  };
}

export async function runOptimizationFlywheel(now = new Date()) {
  const settings = await prisma.appSettings.findFirst();

  if (settings?.automationPaused) {
    return { checked: 0, created: 0, skipped: 0, paused: true };
  }

  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const posts = await prisma.post.findMany({
    where: {
      status: "published",
      publishedAt: {
        gte: sixtyDaysAgo,
        lte: fourteenDaysAgo
      },
      platformPostId: {
        not: null
      },
      account: {
        platform: "threads",
        isActive: true
      }
    },
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
      },
      metrics: {
        orderBy: {
          capturedAt: "desc"
        },
        take: 1
      }
    },
    orderBy: {
      publishedAt: "desc"
    },
    take: 20
  });

  const existingOptimizationDrafts = await prisma.post.findMany({
    where: {
      topicTag: {
        startsWith: "optimize:"
      }
    },
    select: {
      topicTag: true
    }
  });

  const optimizedSourceIds = new Set(
    existingOptimizationDrafts
      .map((post) => post.topicTag?.split(":")[1])
      .filter(Boolean)
  );

  let created = 0;
  let skipped = 0;

  for (const post of posts) {
    const metric = post.metrics[0];
    if (!metric || optimizedSourceIds.has(post.id) || !post.textContent?.trim()) {
      skipped += 1;
      continue;
    }

    const confidence = getOptimizationConfidence(metric);
    if (confidence === "low" && settings?.autopilotMode !== "near_full_auto") {
      skipped += 1;
      continue;
    }

    const replies =
      post.platformPostId
        ? await getPlatformAdapter("threads")
            .getPostReplies(post.accountId, post.platformPostId)
            .then((items) =>
              items
                .filter((item) => item.text.trim().length > 0)
                .slice(0, 5)
                .map((item) => ({ username: item.username, text: item.text }))
            )
            .catch(() => [])
        : [];

    try {
      const aiResult = await rewriteContentWithAi({
        title: `14 天優化：${post.title ?? post.textContent.slice(0, 48)}`,
        rawText: buildOptimizationAssignment({
          text: post.textContent,
          title: post.title,
          metric,
          replies
        }),
        personaPrompt: [
          post.account.personaLabel ? `帳號人設：${post.account.personaLabel}` : "",
          post.account.personaPrompt?.trim() || "",
          settings?.editorialDirection?.trim() ? `站台方向：${settings.editorialDirection.trim()}` : "",
          settings?.editorialGoal?.trim() ? `站台目標：${settings.editorialGoal.trim()}` : ""
        ]
          .filter(Boolean)
          .join("\n\n"),
        tone: post.account.defaultTone?.trim() || settings?.defaultTone?.trim() || "sharp-observer",
        preferredProvider: (settings?.aiProvider?.trim() as "auto" | "gemini" | "claude" | "openai") || "auto"
      });

      const canSchedule = settings?.autopilotMode === "near_full_auto" && confidence === "high";
      const timingSuggestion = canSchedule
        ? inferBestScheduleTime({
            now,
            goal: settings?.editorialGoal ?? post.account.autoGenerateGoal,
            posts: post.account.posts.map((accountPost) => ({
              publishedAt: accountPost.publishedAt,
              metrics: accountPost.metrics.map((item) => ({
                views: item.views,
                likes: item.likes,
                replies: item.replies,
                reposts: item.reposts,
                quotes: item.quotes,
                shares: item.shares
              }))
            }))
          })
        : null;

      const createdDraft = await prisma.post.create({
        data: {
          userId: post.userId,
          accountId: post.accountId,
          contentType: "text",
          title: `[優化] ${aiResult.summary.slice(0, 110)}`,
          textContent: aiResult.threadsDraft,
          excerpt: `14 天觀察後的優化稿｜${confidence === "high" ? "高信心" : "待確認"}｜views ${metric.views} / replies ${metric.replies}`,
          topicTag: `optimize:${post.id}:${confidence}`,
          status: canSchedule ? "scheduled" : "draft",
          scheduledAt: canSchedule ? timingSuggestion?.scheduledAt ?? new Date(now.getTime() + 60 * 60 * 1000) : null,
          isAutoGenerated: true,
          replyToPostId: post.platformPostId
        }
      });

      created += 1;
      await prisma.automationLog.create({
        data: {
          accountId: post.accountId,
          postId: createdDraft.id,
          actionType: "optimization_flywheel",
          status: canSchedule ? "scheduled" : "executed",
          detail: canSchedule
            ? `14 天觀察後已自動產出優化稿並排程。信心：${confidence}。建議時段：${timingSuggestion?.label ?? "近期"}。`
            : `14 天觀察後已自動產出優化稿，送進 Review。信心：${confidence}。`
        }
      });
    } catch (error) {
      await prisma.automationLog.create({
        data: {
          accountId: post.accountId,
          postId: post.id,
          actionType: "optimization_flywheel",
          status: "failed",
          detail: error instanceof Error ? error.message : "Optimization flywheel failed"
        }
      });
    }
  }

  return {
    checked: posts.length,
    created,
    skipped,
    paused: false
  };
}
