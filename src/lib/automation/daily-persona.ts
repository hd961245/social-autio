import { rewriteContentWithAi } from "@/lib/ai/gateway";
import { inferBestScheduleTime } from "@/lib/automation/autopilot-timing";
import { prisma } from "@/lib/prisma";
import { buildAccountStyleMemory } from "@/lib/ai/style-memory";

const AUTOMATION_TIMEZONE = "Asia/Taipei";

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
}) {
  return [
    `今天是 ${params.dateKey}，請為 @${params.accountUsername} 產出一篇原生 Threads 內容。`,
    params.topicFocus?.trim() ? `優先題材：${params.topicFocus.trim()}` : "優先題材：挑一個這個 persona 今天最值得發表觀點的現象、新聞脈絡或市場體感。",
    params.prompt?.trim() ? `今日方向：${params.prompt.trim()}` : "今日方向：不要空泛勵志，請提出一個明確觀點或洞察。",
    params.goal?.trim() ? `希望達成：${params.goal.trim()}` : "希望達成：提高留言意願與停留感。",
    "請直接輸出可發佈的 Threads 內容，開頭要有停留感，中段要有觀點，結尾要有自然 CTA。"
  ]
    .filter(Boolean)
    .join("\n");
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

  if (params.mode === "scheduled-only-if-due" && !isDueForDailyRun(params.now, account.autoGenerateTime)) {
    return {
      status: "skipped" as const,
      reason: "not_due"
    };
  }

  const dateKey = getLocalDateKey(params.now);
  const tagPrefix = params.mode === "force" ? `manual-daily-ai:${account.id}:${dateKey}` : `daily-ai:${account.id}:${dateKey}`;
  const tag = params.mode === "force" ? `${tagPrefix}:${params.now.getTime()}` : tagPrefix;

  if (params.mode !== "force") {
    const existingPost = await prisma.post.findFirst({
      where: {
        accountId: account.id,
        topicTag: tag
      }
    });

    if (existingPost) {
      return {
        status: "skipped" as const,
        reason: "already_created"
      };
    }
  }

  const styleMemory = await buildAccountStyleMemory(account.id);
  const personaPrompt = [
    buildPersonaPlaybook(account),
    settings?.globalPersonaPrompt?.trim() || "用冷靜、有觀點、像內容策略師一樣的語氣，幫我拆解重點。",
    styleMemory,
    settings?.affiliateLinkPolicy?.trim() ? `聯盟與推廣連結策略：${settings.affiliateLinkPolicy.trim()}` : ""
  ]
    .filter(Boolean)
    .join("\n\n");

  const tone = account.defaultTone?.trim() || settings?.defaultTone?.trim() || "sharp-observer";
  const promptSeed = buildDailyIdeaBrief({
    dateKey,
    accountUsername: account.platformUsername,
    topicFocus: account.topicFocus,
    prompt: account.autoGeneratePrompt,
    goal: account.autoGenerateGoal
  });

  const result = await rewriteContentWithAi({
    title: `${account.personaLabel || account.platformUsername} 每日 Threads 題目`,
    rawText: promptSeed,
    personaPrompt,
    tone,
    preferredProvider: (settings?.aiProvider?.trim() as "auto" | "gemini" | "claude" | "openai") || "auto"
  });

  const status = account.autoGenerateMode === "draft" ? "draft" : "scheduled";
  const timingSuggestion =
    status === "scheduled"
      ? inferBestScheduleTime({
          now: params.now,
          goal: account.autoGenerateGoal,
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
  const scheduledAt = status === "scheduled" ? timingSuggestion?.scheduledAt ?? new Date(params.now.getTime() + 60 * 1000) : null;
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

  const detailPrefix = params.mode === "force" ? "已立即試跑這個 persona 的 AI 自動生文" : "已根據 persona 自動產文";
  await prisma.automationLog.create({
    data: {
      accountId: account.id,
      postId: post.id,
      actionType: "daily_persona_generation",
      status,
      detail:
        status === "scheduled"
          ? `${detailPrefix}，並排入佇列（預計 ${scheduledAt?.toLocaleString("zh-TW", { hour12: false })} 發出，建議時段 ${timingSuggestion?.label ?? "即刻"}）。Provider: ${result.provider}`
          : `${detailPrefix}，已存成草稿。Provider: ${result.provider}`
    }
  });

  return {
    status: "created" as const,
    postId: post.id,
    postStatus: status,
    provider: result.provider,
    scheduledForLabel: timingSuggestion?.label ?? null,
    scheduledAt: scheduledAt?.toISOString() ?? null,
    timingDetail: timingSuggestion?.detail ?? null
  };
}
