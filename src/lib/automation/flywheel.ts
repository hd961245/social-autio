import { rewriteContentWithAi } from "@/lib/ai/gateway";
import { inferBestScheduleTime } from "@/lib/automation/autopilot-timing";
import {
  deriveMissionSignals,
  getMissionDraftBoost,
  getMissionLongformBoost,
  getMissionOptimizationBoost,
  type MissionContext
} from "@/lib/mission-scoring";
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
}, missionBoost = 0) {
  const engagement = engagementScore(metric);
  const conversation = conversationScore(metric);
  const amplification = amplificationScore(metric);

  return (
    engagement >= 0.06 - missionBoost * 0.003 ||
    conversation >= 0.018 - missionBoost * 0.0015 ||
    amplification >= 0.012 - missionBoost * 0.001 ||
    metric.replies >= 8 ||
    metric.views >= Math.max(500, 800 - missionBoost * 90)
  );
}

function getOptimizationConfidence(metric: {
  views: number;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
  shares: number;
}, missionBoost = 0) {
  const engagement = engagementScore(metric);
  const conversation = conversationScore(metric);
  const adjustedViews = metric.views + missionBoost * 80;

  if (engagement >= 0.1 - missionBoost * 0.002 || conversation >= 0.03 - missionBoost * 0.001 || adjustedViews >= 1500) {
    return "high" as const;
  }

  if (engagement >= 0.05 - missionBoost * 0.001 || conversation >= 0.015 - missionBoost * 0.0006 || adjustedViews >= 600) {
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

function scoreDraftForAutomation(input: {
  title?: string | null;
  text?: string | null;
  topicTag?: string | null;
  excerpt?: string | null;
  createdAt: Date;
  mission?: MissionContext | null;
}) {
  const title = input.title?.trim() ?? "";
  const text = (input.text ?? "").trim();
  let score = 58;

  if (input.topicTag === "opinion") score += 16;
  if (input.topicTag === "howto") score += 12;
  if (input.topicTag === "news") score += 8;
  if (input.topicTag?.startsWith("optimize:")) score += 18;
  if (title.startsWith("[觀點]")) score += 10;
  if (title.startsWith("[教學]")) score += 8;
  if (title.startsWith("[快訊]")) score += 4;
  if (/\d/.test(text)) score += 6;
  if (text.length >= 80 && text.length <= 230) score += 8;
  if (text.length > 260) score -= 6;
  if ((input.excerpt ?? "").trim().length > 0) score += 6;

  const ageHours = Math.max(0, (Date.now() - input.createdAt.getTime()) / (1000 * 60 * 60));
  score += Math.max(0, 12 - ageHours);

  const missionBoost = getMissionDraftBoost({
    mission: input.mission,
    title: input.title,
    text: input.text,
    topicTag: input.topicTag,
    excerpt: input.excerpt
  });

  return Math.round(Math.min(Math.max(score + missionBoost.scoreDelta, 0), 100));
}

export async function runAutoPromoteDirectDrafts(now = new Date()) {
  const settings = await prisma.appSettings.findFirst();
  const missionContext = {
    title: settings?.missionTitle,
    goal: settings?.editorialGoal,
    direction: settings?.editorialDirection,
    unit: settings?.missionUnit,
    currentValue: settings?.missionCurrentValue,
    targetValue: settings?.missionTargetValue
  };
  const missionSignals = deriveMissionSignals(missionContext);

  if (settings?.automationPaused || settings?.autopilotMode === "review_only") {
    return { checked: 0, promoted: 0, skipped: 0, paused: true };
  }

  const drafts = await prisma.post.findMany({
    where: {
      status: "draft",
      isAutoGenerated: true,
      requiresApproval: false,
      account: {
        platform: "threads",
        isActive: true
      },
      createdAt: {
        gte: new Date(now.getTime() - 72 * 60 * 60 * 1000)
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
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 18
  });

  let promoted = 0;
  let skipped = 0;

  for (const draft of drafts) {
    const score = scoreDraftForAutomation({
      title: draft.title,
      text: draft.textContent,
      topicTag: draft.topicTag,
      excerpt: draft.excerpt,
      createdAt: draft.createdAt,
      mission: missionContext
    });
    const threshold =
      settings?.autopilotMode === "near_full_auto"
        ? missionSignals.focusTraffic || missionSignals.focusSearch || missionSignals.focusKnowledge || missionSignals.focusConversation
          ? 64
          : 70
        : settings?.autopilotMode === "auto_schedule"
          ? 78
          : 86;

    if (score < threshold) {
      skipped += 1;
      continue;
    }

    const timingSuggestion = inferBestScheduleTime({
      now,
      goal: settings?.editorialGoal ?? draft.account.autoGenerateGoal,
      posts: draft.account.posts.map((post) => ({
        publishedAt: post.publishedAt,
        metrics: post.metrics.map((metric) => ({
          views: metric.views,
          likes: metric.likes,
          replies: metric.replies,
          reposts: metric.reposts,
          quotes: metric.quotes,
          shares: metric.shares
        }))
      }))
    });

    await prisma.post.update({
      where: { id: draft.id },
      data: {
        status: "scheduled",
        scheduledAt: timingSuggestion.scheduledAt
      }
    });

    promoted += 1;
    await prisma.automationLog.create({
      data: {
        accountId: draft.accountId,
        postId: draft.id,
        actionType: "auto_promote_review_draft",
        status: "scheduled",
        detail: `系統已自動把高信心 Threads 候選稿升級進排程。分數：${score}。建議時段：${timingSuggestion.label}。`
      }
    });
  }

  return {
    checked: drafts.length,
    promoted,
    skipped,
    paused: false
  };
}

export async function runAutoWordPressExpansion(now = new Date()) {
  const settings = await prisma.appSettings.findFirst();
  const missionContext = {
    title: settings?.missionTitle,
    goal: settings?.editorialGoal,
    direction: settings?.editorialDirection,
    unit: settings?.missionUnit,
    currentValue: settings?.missionCurrentValue,
    targetValue: settings?.missionTargetValue
  };

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

    const missionBoost = getMissionLongformBoost({
      mission: missionContext,
      text: `${post.title ?? ""} ${post.textContent ?? ""}`.trim(),
      views: metric.views,
      replies: metric.replies
    });

    if (!isLongformEligible(metric, missionBoost.eligibleBias)) {
      skipped += 1;
      continue;
    }

    try {
      const result = await syncPostToWordPress(post.id, {
        forcePublish: settings?.autopilotMode === "near_full_auto"
      });
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
  const missionContext = {
    title: settings?.missionTitle,
    goal: settings?.editorialGoal,
    direction: settings?.editorialDirection,
    unit: settings?.missionUnit,
    currentValue: settings?.missionCurrentValue,
    targetValue: settings?.missionTargetValue
  };
  const missionSignals = deriveMissionSignals(missionContext);

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

    const missionBoost = getMissionOptimizationBoost({
      mission: missionContext,
      text: `${post.title ?? ""} ${post.textContent ?? ""}`.trim(),
      replies: metric.replies
    });
    const confidence = getOptimizationConfidence(metric, missionBoost.scoreDelta / 6);
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

      const canSchedule =
        settings?.autopilotMode === "near_full_auto"
          ? confidence !== "low" || missionSignals.focusTraffic || missionSignals.focusSearch
          : settings?.autopilotMode === "auto_schedule"
            ? confidence === "high"
            : false;
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
