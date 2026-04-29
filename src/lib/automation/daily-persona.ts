import { rewriteContentWithAi } from "@/lib/ai/gateway";
import { inferBestScheduleTime } from "@/lib/automation/autopilot-timing";
import { prisma } from "@/lib/prisma";
import { buildAccountStyleMemory } from "@/lib/ai/style-memory";
import { buildEditorialMemoryPrompt } from "@/lib/content/editorial-presets";
import { getPlatformAdapter } from "@/lib/platforms";

const AUTOMATION_TIMEZONE = "Asia/Taipei";
const DAILY_DRAFT_CANDIDATE_COUNT = 3;
const DAILY_VARIANT_ANGLES = [
  "主打明確結論與第一句停留感，適合直接發在 Threads 首屏。",
  "主打案例或情境切入，讓讀者覺得這篇是在講自己。",
  "主打討論感與留言誘因，讓結尾自然帶出互動。"
] as const;

type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function getDatePartsInTimezone(date: Date, timeZone = AUTOMATION_TIMEZONE): DateParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? "0");

  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),
    hour: getPart("hour"),
    minute: getPart("minute")
  };
}

function getLocalDateKey(date: Date, timeZone = AUTOMATION_TIMEZONE) {
  const parts = getDatePartsInTimezone(date, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function isDueForDailyRun(date: Date, timeText: string | null | undefined, timeZone = AUTOMATION_TIMEZONE) {
  const [rawHour, rawMinute] = (timeText || "09:00").split(":");
  const targetHour = Number(rawHour);
  const targetMinute = Number(rawMinute);
  const now = getDatePartsInTimezone(date, timeZone);

  if (Number.isNaN(targetHour) || Number.isNaN(targetMinute)) {
    return false;
  }

  return now.hour > targetHour || (now.hour === targetHour && now.minute >= targetMinute);
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

function buildDailyIdeaBrief(params: {
  dateKey: string;
  accountUsername: string;
  topicFocus?: string | null;
  prompt?: string | null;
  goal?: string | null;
  variantIndex?: number;
}) {
  const variantHint =
    typeof params.variantIndex === "number"
      ? DAILY_VARIANT_ANGLES[params.variantIndex % DAILY_VARIANT_ANGLES.length]
      : null;

  return [
    `今天是 ${params.dateKey}，請為 @${params.accountUsername} 產出一篇原生 Threads 內容。`,
    params.topicFocus?.trim() ? `優先題材：${params.topicFocus.trim()}` : "優先題材：挑一個這個 persona 今天最值得發表觀點的現象、新聞脈絡或市場體感。",
    params.prompt?.trim() ? `今日方向：${params.prompt.trim()}` : "今日方向：不要空泛勵志，請提出一個明確觀點或洞察。",
    params.goal?.trim() ? `希望達成：${params.goal.trim()}` : "希望達成：提高留言意願與停留感。",
    variantHint ? `這一篇候選稿角度：${variantHint}` : "",
    "請直接輸出可發佈的 Threads 內容，開頭要有停留感，中段要有觀點，結尾要有自然 CTA。"
  ]
    .filter(Boolean)
    .join("\n");
}

function getMetricScore(metric?: {
  views: number;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
  shares: number;
} | null) {
  if (!metric) {
    return 0;
  }

  return metric.views + metric.likes * 12 + metric.replies * 18 + metric.reposts * 22 + metric.quotes * 18 + metric.shares * 20;
}

function squeezeText(value: string, max = 180) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > max ? `${normalized.slice(0, max - 1)}…` : normalized;
}

async function buildAutopilotFeedbackMemory(input: {
  accountId: string;
  accountUsername: string;
  posts: Array<{
    textContent: string | null;
    title: string | null;
    platformPostId: string | null;
    publishedAt: Date | null;
    metrics: Array<{
      views: number;
      likes: number;
      replies: number;
      reposts: number;
      quotes: number;
      shares: number;
    }>;
  }>;
}) {
  const topPosts = [...input.posts]
    .sort((left, right) => getMetricScore(right.metrics[0]) - getMetricScore(left.metrics[0]))
    .slice(0, 3)
    .map((post, index) => {
      const metric = post.metrics[0];
      const summary = squeezeText(post.textContent ?? post.title ?? "", 170);
      if (!summary) {
        return "";
      }

      return `高表現貼文 ${index + 1}：${summary}\n訊號：views ${metric?.views ?? 0} / likes ${metric?.likes ?? 0} / replies ${metric?.replies ?? 0} / reposts ${metric?.reposts ?? 0}`;
    })
    .filter(Boolean)
    .join("\n\n");

  const replySource = input.posts.find((post) => post.platformPostId);
  let replySignals = "";

  if (replySource?.platformPostId) {
    try {
      const replies = await getPlatformAdapter("threads").getPostReplies(input.accountId, replySource.platformPostId);
      const meaningfulReplies = replies
        .filter((reply) => reply.text.trim().length > 0)
        .slice(0, 5)
        .map((reply, index) => `${index + 1}. @${reply.username}: ${squeezeText(reply.text, 120)}`);

      if (meaningfulReplies.length > 0) {
        replySignals = [
          `最近這個 persona 的留言樣本（@${input.accountUsername}）：`,
          ...meaningfulReplies,
          "請留意留言裡反覆出現的疑問、反對點或延伸需求，讓下一篇更像在接續這波討論。"
        ].join("\n");
      }
    } catch {
      replySignals = "";
    }
  }

  if (!topPosts && !replySignals) {
    return "";
  }

  return [
    topPosts ? `最近高表現內容記憶：\n${topPosts}` : "",
    replySignals
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function buildRecentSourceMemory(userId: string) {
  const ingestions = await prisma.ingestionRecord.findMany({
    where: {
      userId,
      sourceUrl: {
        not: null
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 3
  });

  if (!ingestions.length) {
    return "";
  }

  const lines = ingestions
    .map((item, index) => {
      const title = item.title?.trim() || "未命名來源";
      const snippet = squeezeText(item.rawText || "", 140);
      if (!snippet) {
        return "";
      }

      return `${index + 1}. ${title}\n來源訊號：${snippet}`;
    })
    .filter(Boolean);

  if (!lines.length) {
    return "";
  }

  return [
    "最近來源題目庫：",
    ...lines,
    "如果今天要自動生一篇，優先承接這些來源裡最值得延伸的角度，不要像跟來源無關的空泛日更。"
  ].join("\n");
}

export async function runDailyPersonaAutopilot(now = new Date()) {
  const settings = await prisma.appSettings.findFirst();

  if (settings?.automationPaused) {
    return {
      checked: 0,
      created: 0,
      skipped: 0,
      failed: 0,
      paused: true
    };
  }

  const accounts = await prisma.platformAccount.findMany({
    where: {
      isActive: true,
      platform: "threads",
      autoGenerateEnabled: true
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const account of accounts) {
    try {
      const outcome = await generateDailyPersonaPost({
        accountId: account.id,
        now,
        mode: "scheduled-only-if-due"
      });

      if (outcome.status === "created") {
        created += 1;
      } else if (outcome.status === "skipped") {
        skipped += 1;
      }
    } catch (error) {
      await prisma.automationLog.create({
        data: {
          accountId: account.id,
          actionType: "daily_persona_generation",
          status: "failed",
          detail: error instanceof Error ? error.message : "Daily persona autopilot failed"
        }
      });
      failed += 1;
    }
  }

  return {
    checked: accounts.length,
    created,
    skipped,
    failed,
    paused: false
  };
}

export async function runDailyPersonaForAccount(accountId: string, now = new Date()) {
  return generateDailyPersonaPost({
    accountId,
    now,
    mode: "force"
  });
}

async function generateDailyPersonaPost(params: {
  accountId: string;
  now: Date;
  mode: "scheduled-only-if-due" | "force";
}) {
  const [settings, account] = await Promise.all([
    prisma.appSettings.findFirst(),
    prisma.platformAccount.findFirst({
      where: {
        id: params.accountId,
        isActive: true,
        platform: "threads"
      },
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
    })
  ]);

  if (!account) {
    throw new Error("找不到可用的 Threads 帳號。");
  }

  const wordpressSite = await prisma.platformAccount.findFirst({
    where: {
      userId: account.userId,
      platform: "wordpress",
      isActive: true
    },
    orderBy: [{ lastSyncedAt: "desc" }, { createdAt: "desc" }]
  });

  if (params.mode === "scheduled-only-if-due" && !isDueForDailyRun(params.now, account.autoGenerateTime)) {
    return {
      status: "skipped" as const,
      reason: "not_due"
    };
  }

  const dateKey = getLocalDateKey(params.now);
  const tagPrefix = params.mode === "force" ? `manual-daily-ai:${account.id}:${dateKey}:${params.now.getTime()}` : `daily-ai:${account.id}:${dateKey}`;
  const desiredCount = account.autoGenerateMode === "draft" ? DAILY_DRAFT_CANDIDATE_COUNT : 1;

  const existingPosts = await prisma.post.findMany({
    where: {
      accountId: account.id,
      topicTag: {
        startsWith: tagPrefix
      }
    },
    orderBy: {
      createdAt: "asc"
    },
    select: {
      id: true,
      topicTag: true,
      status: true
    }
  });

  if (params.mode !== "force" && existingPosts.length >= desiredCount) {
    return {
      status: "skipped" as const,
      reason: "already_created"
    };
  }

  const styleMemory = await buildAccountStyleMemory(account.id, {
    concise: true
  });
  const sourceMemory = await buildRecentSourceMemory(account.userId);
  const feedbackMemory = await buildAutopilotFeedbackMemory({
    accountId: account.id,
    accountUsername: account.platformUsername,
    posts: account.posts.map((post) => ({
      textContent: post.textContent,
      title: post.title,
      platformPostId: post.platformPostId,
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
  const editorialMemory = buildEditorialMemoryPrompt({
    siteUrl: wordpressSite?.platformUserId,
    globalPersonaPrompt: settings?.globalPersonaPrompt,
    writingStyleProfile: settings?.writingStyleProfile,
    affiliateLinkPolicy: settings?.affiliateLinkPolicy,
    concise: true
  });
  const personaPrompt = [
    buildPersonaPlaybook(account),
    editorialMemory || settings?.globalPersonaPrompt?.trim() || "用冷靜、有觀點、像內容策略師一樣的語氣，幫我拆解重點。",
    styleMemory,
    sourceMemory,
    feedbackMemory
  ]
    .filter(Boolean)
    .join("\n\n");

  const tone = account.defaultTone?.trim() || settings?.defaultTone?.trim() || "sharp-observer";
  const status = account.autoGenerateMode === "draft" ? "draft" : "scheduled";
  const timingSuggestion =
    status === "scheduled"
      ? inferBestScheduleTime({
          now: params.now,
          goal: account.autoGenerateGoal || settings?.editorialGoal,
          posts: account.posts.map((post) => ({
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
        })
      : null;
  const createdPostIds: string[] = [];
  let providerUsed: string | null = null;

  for (let variantIndex = existingPosts.length; variantIndex < desiredCount; variantIndex += 1) {
    const promptSeed = buildDailyIdeaBrief({
      dateKey,
      accountUsername: account.platformUsername,
      topicFocus: account.topicFocus,
      prompt: account.autoGeneratePrompt || settings?.editorialDirection,
      goal: account.autoGenerateGoal || settings?.editorialGoal,
      variantIndex
    });

    const result = await rewriteContentWithAi({
      title: `${account.personaLabel || account.platformUsername} 每日 Threads 題目 ${variantIndex + 1}`,
      rawText: promptSeed,
      personaPrompt,
      tone,
      preferredProvider: (settings?.aiProvider?.trim() as "auto" | "gemini" | "claude" | "openai") || "auto"
    });

    providerUsed = result.provider;
    const scheduledAt = status === "scheduled" ? timingSuggestion?.scheduledAt ?? new Date(params.now.getTime() + 60 * 1000) : null;
    const tag = `${tagPrefix}:${variantIndex + 1}`;
    const post = await prisma.post.create({
      data: {
        userId: account.userId,
        accountId: account.id,
        contentType: "text",
        title: result.summary.slice(0, 120),
        textContent: result.threadsDraft,
        status,
        scheduledAt,
        isAutoGenerated: true,
        topicTag: tag
      }
    });
    createdPostIds.push(post.id);

    const detailPrefix = params.mode === "force" ? "已立即試跑這個 persona 的 AI 自動生文" : "已根據 persona 自動產文";
    await prisma.automationLog.create({
      data: {
        accountId: account.id,
        postId: post.id,
        actionType: "daily_persona_generation",
        status,
        detail:
          status === "scheduled"
            ? `${detailPrefix}，並排入佇列（預計 ${scheduledAt?.toLocaleString("zh-TW", { hour12: false })} 發出，建議時段 ${timingSuggestion?.label ?? "即刻"}）。方向：${(account.autoGeneratePrompt || settings?.editorialDirection || "站台預設方向").slice(0, 36)}。Provider: ${result.provider}`
            : `${detailPrefix}，已存成候選草稿 ${variantIndex + 1} / ${desiredCount}。方向：${(account.autoGeneratePrompt || settings?.editorialDirection || "站台預設方向").slice(0, 36)}。Provider: ${result.provider}`
      }
    });
  }

  return {
    status: "created" as const,
    postIds: createdPostIds,
    postId: createdPostIds[0] ?? null,
    createdCount: createdPostIds.length,
    targetCount: desiredCount,
    postStatus: status,
    provider: providerUsed,
    scheduledForLabel: timingSuggestion?.label ?? null,
    scheduledAt: status === "scheduled" ? (timingSuggestion?.scheduledAt ?? new Date(params.now.getTime() + 60 * 1000)).toISOString() : null,
    timingDetail: timingSuggestion?.detail ?? null
  };
}
