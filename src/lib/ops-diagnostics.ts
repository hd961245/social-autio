import { runGeminiHealthCheck } from "@/lib/ai/health";
import { prisma } from "@/lib/prisma";
import { withRuntimeCache } from "@/lib/runtime-cache";

type EnvCheck = {
  key: string;
  status: "present" | "missing";
  detail: string;
};

type OpsDiagnostics = {
  database: {
    ready: boolean;
    detail: string;
  };
  envChecks: EnvCheck[];
  records: {
    threadsAccounts: number;
    wordpressAccounts: number;
    posts: number;
    sourceWatches: number;
  };
  aiHealth: {
    configured: {
      openai: boolean;
      gemini: boolean;
      claude: boolean;
    };
    gemini: {
      ok: boolean;
      model?: string;
      latencyMs?: number;
      message: string;
    };
  };
  schema: {
    looksDrifted: boolean;
    detail: string;
    checks: Array<{
      column: string;
      status: "present" | "missing";
    }>;
  };
  warnings: string[];
  hints: string[];
  threadsCallbackLogs: Array<{
    id: string;
    status: string;
    detail: string;
    executedAt: string;
  }>;
  runtimeChecks: Array<{
    label: string;
    value: string;
    detail: string;
    tone: "good" | "warn" | "bad";
  }>;
  runtimeLogs: Array<{
    id: string;
    actionType: string;
    status: string;
    detail: string;
    executedAt: string;
  }>;
  deployChecklist: Array<{
    label: string;
    status: "pass" | "check" | "fail";
    detail: string;
  }>;
  autoPublishReadiness: {
    status: "ready" | "degraded" | "blocked";
    summary: string;
    detail: string;
    counts: {
      activeThreadsAccounts: number;
      expiringThreadsTokens: number;
      dueScheduledPosts: number;
      awaitingApprovalPosts: number;
      failedScheduledPosts: number;
    };
    checks: Array<{
      label: string;
      status: "pass" | "check" | "fail";
      detail: string;
    }>;
    latestActivity: Array<{
      label: string;
      value: string;
      detail: string;
      tone: "good" | "warn" | "bad";
    }>;
  };
};

function maskConnectionString(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname;
    const databaseName = url.pathname.replace(/^\//, "") || "(unknown-db)";
    return `${host}/${databaseName}`;
  } catch {
    return "configured";
  }
}

function checkEnv(key: string, value: string | undefined, options?: { mask?: boolean }): EnvCheck {
  if (!value) {
    return {
      key,
      status: "missing",
      detail: "not set"
    };
  }

  return {
    key,
    status: "present",
    detail: options?.mask ? maskConnectionString(value) : "configured"
  };
}

export async function getOpsDiagnostics(): Promise<OpsDiagnostics> {
  return withRuntimeCache("ops-diagnostics", 5 * 60 * 1000, async () => {
    const envChecks: EnvCheck[] = [
      checkEnv("DATABASE_URL", process.env.DATABASE_URL, { mask: true }),
      checkEnv("ADMIN_PASSWORD", process.env.ADMIN_PASSWORD),
      checkEnv("ADMIN_SESSION_SECRET", process.env.ADMIN_SESSION_SECRET),
      checkEnv("THREADS_APP_ID", process.env.THREADS_APP_ID),
      checkEnv("THREADS_APP_SECRET", process.env.THREADS_APP_SECRET),
      checkEnv("THREADS_REDIRECT_URI", process.env.THREADS_REDIRECT_URI),
      checkEnv("TOKEN_ENCRYPTION_KEY", process.env.TOKEN_ENCRYPTION_KEY),
      checkEnv("DISCORD_DAILY_WEBHOOK_URL", process.env.DISCORD_DAILY_WEBHOOK_URL),
      checkEnv("TELEGRAM_BOT_TOKEN", process.env.TELEGRAM_BOT_TOKEN),
      checkEnv("TELEGRAM_CHAT_ID", process.env.TELEGRAM_CHAT_ID),
      checkEnv("GOOGLE_OAUTH_CLIENT_ID", process.env.GOOGLE_OAUTH_CLIENT_ID),
      checkEnv("GOOGLE_OAUTH_CLIENT_SECRET", process.env.GOOGLE_OAUTH_CLIENT_SECRET),
      checkEnv("GOOGLE_OAUTH_REFRESH_TOKEN", process.env.GOOGLE_OAUTH_REFRESH_TOKEN),
      checkEnv("GSC_SITE_URL", process.env.GSC_SITE_URL),
      checkEnv("GSC_CLIENT_EMAIL", process.env.GSC_CLIENT_EMAIL ?? process.env.GA4_CLIENT_EMAIL),
      checkEnv("CRON_SECRET", process.env.CRON_SECRET),
      checkEnv("INNGEST_EVENT_KEY", process.env.INNGEST_EVENT_KEY),
      checkEnv("INNGEST_SIGNING_KEY", process.env.INNGEST_SIGNING_KEY),
      checkEnv("INNGEST_SERVE_ORIGIN", process.env.INNGEST_SERVE_ORIGIN)
    ];

    const warnings: string[] = [];
    const hints: string[] = [];
    const geminiHealth = await runGeminiHealthCheck();

    const buildBlockedReadiness = (detail: string): OpsDiagnostics["autoPublishReadiness"] => ({
      status: "blocked",
      summary: "自動發文目前被阻塞",
      detail,
      counts: {
        activeThreadsAccounts: 0,
        expiringThreadsTokens: 0,
        dueScheduledPosts: 0,
        awaitingApprovalPosts: 0,
        failedScheduledPosts: 0
      },
      checks: [
        {
          label: "資料庫 / 基本連線",
          status: process.env.DATABASE_URL ? "check" : "fail",
          detail
        },
        {
          label: "Threads 發文條件",
          status:
            process.env.THREADS_APP_ID && process.env.THREADS_APP_SECRET && process.env.THREADS_REDIRECT_URI && process.env.TOKEN_ENCRYPTION_KEY
              ? "check"
              : "fail",
          detail:
            process.env.THREADS_APP_ID && process.env.THREADS_APP_SECRET && process.env.THREADS_REDIRECT_URI && process.env.TOKEN_ENCRYPTION_KEY
              ? "Threads env 已存在，但還沒確認資料庫與排程狀態。"
              : "Threads env 不完整，現在就算有排程貼文也發不出去。"
        }
      ],
      latestActivity: [
        {
          label: "Scheduler",
          value: "Unknown",
          detail: "目前還無法判斷 scheduler 最近是否有正常執行。",
          tone: "bad"
        }
      ]
    });

    try {
      const [
        threadsAccounts,
        wordpressAccounts,
        posts,
        sourceWatches,
        schemaRows,
        activeThreadsAccounts,
        expiringThreadsTokens,
        dueScheduledPosts,
        awaitingApprovalPosts,
        failedScheduledPosts
      ] = await Promise.all([
      prisma.platformAccount.count({ where: { platform: "threads" } }),
      prisma.platformAccount.count({ where: { platform: "wordpress" } }),
      prisma.post.count(),
      prisma.sourceWatch.count(),
      prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
        `select column_name
         from information_schema.columns
         where table_name = 'AppSettings'
           and column_name in ('editorialDirection', 'editorialGoal', 'missionTitle', 'autopilotMode', 'wordpressPublishMode')`
      ),
      prisma.platformAccount.count({
        where: {
          platform: "threads",
          isActive: true
        }
      }),
      prisma.platformAccount.count({
        where: {
          platform: "threads",
          isActive: true,
          tokenExpiresAt: {
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      prisma.post.count({
        where: {
          status: "scheduled",
          scheduledAt: {
            lte: new Date()
          },
          account: {
            platform: "threads",
            isActive: true
          }
        }
      }),
      prisma.post.count({
        where: {
          status: "awaiting_approval",
          account: {
            platform: "threads",
            isActive: true
          }
        }
      }),
      prisma.post.count({
        where: {
          status: "failed",
          account: {
            platform: "threads"
          },
          updatedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);
      const callbackLogs = await prisma.automationLog.findMany({
      where: {
        actionType: "threads_callback"
      },
      orderBy: {
        executedAt: "desc"
      },
      take: 5
    });
    const runtimeLogs = await prisma.automationLog.findMany({
      where: {
        actionType: {
          in: ["ops_heartbeat", "ops_scheduler"]
        }
      },
      orderBy: {
        executedAt: "desc"
      },
      take: 10
    });
      const schemaColumns = new Set(schemaRows.map((row) => row.column_name));
      const schemaChecks = ["editorialDirection", "editorialGoal", "missionTitle", "autopilotMode", "wordpressPublishMode"].map((column) => ({
        column,
        status: schemaColumns.has(column) ? ("present" as const) : ("missing" as const)
      }));
      const looksDrifted = schemaChecks.some((check) => check.status === "missing");

      const latestHeartbeat = runtimeLogs.find((log) => log.actionType === "ops_heartbeat");
      const latestScheduler = runtimeLogs.find((log) => log.actionType === "ops_scheduler");
      const latestScheduledPublish = await prisma.automationLog.findFirst({
        where: {
          actionType: {
            in: ["threads_scheduled_publish", "threads_scheduled_failed"]
          }
        },
        include: {
          account: true
        },
        orderBy: {
          executedAt: "desc"
        }
      });
      const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

      const runtimeChecks: OpsDiagnostics["runtimeChecks"] = [
        {
          label: "CRON Heartbeat",
          value: latestHeartbeat ? latestHeartbeat.executedAt.toLocaleString("zh-TW", { hour12: false }) : "Never",
          detail: latestHeartbeat?.detail ?? "還沒有看到 heartbeat 執行紀錄。",
          tone: !latestHeartbeat
            ? "bad"
            : latestHeartbeat.status === "failed"
              ? "bad"
              : latestHeartbeat.executedAt.getTime() < fifteenMinutesAgo
                ? "warn"
                : "good"
        },
        {
          label: "CRON Scheduler",
          value: latestScheduler ? latestScheduler.executedAt.toLocaleString("zh-TW", { hour12: false }) : "Never",
          detail: latestScheduler?.detail ?? "還沒有看到 scheduler 執行紀錄。",
          tone: !latestScheduler
            ? "bad"
            : latestScheduler.status === "failed"
              ? "bad"
              : latestScheduler.executedAt.getTime() < fiveMinutesAgo
                ? "warn"
                : "good"
        }
      ];

    if (!latestHeartbeat) {
      warnings.push("目前還沒有 heartbeat 執行紀錄，代表外部 cron 或舊 autopilot heartbeat 可能還沒真的打進來。");
      hints.push("部署完成後先手動打一次 `/api/cron/heartbeat?secret=...`，確認 `/ops` 會出現 CRON Heartbeat。");
    }

    if (!latestScheduler) {
      warnings.push("目前還沒有 scheduler 執行紀錄，代表排程送文器還沒有真的跑過。");
      hints.push("至少先讓外部 cron 每分鐘打一次 `/api/cron/scheduler?secret=...`，確認 `/ops` 會出現 CRON Scheduler。");
    }

    if (latestHeartbeat && latestHeartbeat.executedAt.getTime() < fifteenMinutesAgo) {
      warnings.push("最近一次 heartbeat 超過 15 分鐘，背景飛輪可能已經停住。");
      hints.push("確認 Zeabur / 外部 cron 是否仍在定時呼叫 heartbeat route。");
    }

    if (latestScheduler && latestScheduler.executedAt.getTime() < fiveMinutesAgo) {
      warnings.push("最近一次 scheduler 超過 5 分鐘，排程發文鏈可能沒有持續在跑。");
      hints.push("確認 `/api/cron/scheduler` 或舊 scheduler 排程是否還在正常執行。");
    }

    if (!process.env.DATABASE_URL) {
      warnings.push("目前沒有 DATABASE_URL，這份環境不會讀到原本雲端資料。");
      hints.push("先到 Zeabur app service 的環境變數確認 `DATABASE_URL` 是否存在。");
    }

    if (threadsAccounts === 0 && wordpressAccounts === 0) {
      warnings.push("目前帳號資料為 0。若你之前已連接過帳號，這通常代表現在連到的是空資料庫或錯的環境。");
      hints.push("如果你以前已連接過 Threads 或 WordPress，優先確認現在是不是連到新的空 PostgreSQL addon。");
    }

    if (!process.env.INNGEST_EVENT_KEY || !process.env.INNGEST_SIGNING_KEY || !process.env.INNGEST_SERVE_ORIGIN) {
      warnings.push("Inngest 環境變數不完整，排程任務可能不會正常工作。");
      hints.push("補齊 `INNGEST_EVENT_KEY`、`INNGEST_SIGNING_KEY`、`INNGEST_SERVE_ORIGIN` 後，再到 Inngest 確認 `/api/inngest` 已 sync。");
    }

    if (!process.env.CRON_SECRET) {
      warnings.push("目前沒有設定 CRON_SECRET，若要用外部 cron 打 `/api/cron/heartbeat` 與 `/api/cron/scheduler`，請先補上。");
      hints.push("如果 Inngest 還沒接好，至少先設定 `CRON_SECRET`，再用外部 cron 定時呼叫 `/api/cron/heartbeat?secret=...`。");
    }

    if (!geminiHealth.ok) {
      warnings.push(`Gemini health check 失敗：${geminiHealth.message}`);
      hints.push("如果你主要靠 Gemini 產文，先確認 `GEMINI_API_KEY`、`GEMINI_MODEL` 是否正確，再測一次 `/api/ai/health`。");
    }

    if (looksDrifted) {
      warnings.push("目前資料庫欄位看起來落後於最新 schema，這份環境很可能還沒跑最新的 db:push。");
      hints.push("目前線上環境請先執行 `npm run db:push`，再重新測一次 Accounts / Autopilot / AI 相關頁面。");
    }

    if (process.env.DATABASE_URL && (threadsAccounts > 0 || wordpressAccounts > 0)) {
      hints.push("目前資料庫裡有帳號資料，若前台仍看不到，優先檢查是不是看錯 project / environment 或 session 狀態。");
    }

    if (process.env.DATABASE_URL && threadsAccounts === 0 && wordpressAccounts === 0 && posts === 0) {
      hints.push("這份環境很像是 schema 已建好但資料為空的全新資料庫。不要急著重連帳號，先確認是不是接錯 DB。");
    }

    if (callbackLogs.some((log) => log.status === "executed") && threadsAccounts === 0) {
      warnings.push("最近 Threads callback 有成功，但資料庫裡仍然看不到 Threads 帳號，優先懷疑你現在看的不是同一個 DB / environment。");
      hints.push("如果 callback log 顯示 executed、但 Threads Accounts 還是 0，先比對 Zeabur app service 與 callback 實際命中的環境是不是同一份。");
    }

      const deployChecklist: OpsDiagnostics["deployChecklist"] = [
        {
        label: "DATABASE_URL / DB 連線",
        status: process.env.DATABASE_URL ? "pass" : "fail",
        detail: process.env.DATABASE_URL ? `已連到 ${maskConnectionString(process.env.DATABASE_URL)}` : "缺少 DATABASE_URL，這份環境不能正常工作。"
      },
      {
        label: "Schema 已同步",
        status: looksDrifted ? "fail" : "pass",
        detail: looksDrifted ? "偵測到新欄位缺失，請先執行 npm run db:push。" : "抽查到的新欄位都已存在。"
      },
      {
        label: "Threads 基本 env",
        status:
          process.env.THREADS_APP_ID && process.env.THREADS_APP_SECRET && process.env.THREADS_REDIRECT_URI && process.env.TOKEN_ENCRYPTION_KEY
            ? "pass"
            : "fail",
        detail:
          process.env.THREADS_APP_ID && process.env.THREADS_APP_SECRET && process.env.THREADS_REDIRECT_URI && process.env.TOKEN_ENCRYPTION_KEY
            ? "Threads OAuth 需要的基本變數已存在。"
            : "Threads OAuth 需要的 env 不完整。"
      },
      {
        label: "AI Provider 健康",
        status:
          geminiHealth.ok || Boolean(process.env.OPENAI_API_KEY) || Boolean(process.env.ANTHROPIC_API_KEY)
            ? geminiHealth.ok
              ? "pass"
              : "check"
            : "fail",
        detail:
          geminiHealth.ok
            ? `Gemini 可用，模型 ${geminiHealth.model ?? "n/a"}。`
            : Boolean(process.env.OPENAI_API_KEY) || Boolean(process.env.ANTHROPIC_API_KEY)
              ? "Gemini 健康檢查未過，但仍有其他 AI provider 可作為備援。"
              : "目前沒有可用的 AI provider。"
      },
      {
        label: "GA4 / GSC 讀取憑證",
        status:
          (process.env.GOOGLE_OAUTH_CLIENT_ID &&
            process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
            process.env.GOOGLE_OAUTH_REFRESH_TOKEN) ||
          (process.env.GA4_CLIENT_EMAIL && process.env.GA4_PRIVATE_KEY)
            ? "pass"
            : "check",
        detail:
          process.env.GOOGLE_OAUTH_CLIENT_ID &&
          process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
          process.env.GOOGLE_OAUTH_REFRESH_TOKEN
            ? "已設定 Google OAuth 使用者憑證，可直接讀 GA4 / Search Console。"
            : process.env.GA4_CLIENT_EMAIL && process.env.GA4_PRIVATE_KEY
              ? "已設定 service account 憑證，可讀 GA4 / Search Console。"
              : "尚未設定 Google OAuth 或 service account 憑證。"
      },
      {
        label: "每日日報 / Discord / Telegram",
        status:
          process.env.DISCORD_DAILY_WEBHOOK_URL || (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)
            ? "pass"
            : "check",
        detail:
          process.env.DISCORD_DAILY_WEBHOOK_URL
            ? "Discord 已設定，每日日報會優先送到 Discord。"
            : process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID
              ? "Telegram 已設定，每日日報可以自動送出。"
              : "尚未設定 Discord 或 Telegram，系統仍可自動跑，但你不會收到每日日報。"
      },
      {
        label: "Inngest / 排程",
        status:
          process.env.INNGEST_EVENT_KEY && process.env.INNGEST_SIGNING_KEY && process.env.INNGEST_SERVE_ORIGIN
            ? "pass"
            : "check",
        detail:
          process.env.INNGEST_EVENT_KEY && process.env.INNGEST_SIGNING_KEY && process.env.INNGEST_SERVE_ORIGIN
            ? "Inngest 主要 env 已存在。"
            : "Inngest env 不完整，手動功能可用，但排程可能不穩。"
      },
      {
        label: "External cron fallback",
        status: process.env.CRON_SECRET ? "pass" : "check",
        detail: process.env.CRON_SECRET
          ? "已可安全呼叫 `/api/cron/heartbeat` 或 `/api/cron/scheduler` 當作排程備援。"
          : "尚未設定 CRON_SECRET，外部 cron 備援還沒建立。"
      },
      {
        label: "已有 Threads 帳號",
        status: threadsAccounts > 0 ? "pass" : "check",
        detail: threadsAccounts > 0 ? `目前資料庫裡有 ${threadsAccounts} 個 Threads 帳號。` : "目前還沒有 Threads 帳號，之後可能需要重新授權。"
        }
      ];

      const schedulerHealthy =
        Boolean(latestScheduler) &&
        latestScheduler?.status !== "failed" &&
        (latestScheduler?.executedAt.getTime() ?? 0) >= fiveMinutesAgo;
      const hasThreadsEnv = Boolean(
        process.env.THREADS_APP_ID &&
          process.env.THREADS_APP_SECRET &&
          process.env.THREADS_REDIRECT_URI &&
          process.env.TOKEN_ENCRYPTION_KEY
      );
      const hasSchedulerPath = Boolean(
        (process.env.INNGEST_EVENT_KEY && process.env.INNGEST_SIGNING_KEY && process.env.INNGEST_SERVE_ORIGIN) || process.env.CRON_SECRET
      );
      const readinessChecks: OpsDiagnostics["autoPublishReadiness"]["checks"] = [
        {
          label: "Threads 發文 env",
          status: hasThreadsEnv ? "pass" : "fail",
          detail: hasThreadsEnv ? "Threads OAuth 與 token 加密需要的變數都存在。" : "缺少 Threads env，排程就算跑到 publish 也送不出去。"
        },
        {
          label: "排程入口",
          status: hasSchedulerPath ? "pass" : "fail",
          detail: hasSchedulerPath ? "已找到 Inngest 或外部 cron 其中一條排程路徑。" : "目前既沒有完整 Inngest，也沒有 CRON fallback。"
        },
        {
          label: "Scheduler 最近狀態",
          status: !latestScheduler ? "fail" : schedulerHealthy ? "pass" : "check",
          detail: latestScheduler
            ? `${latestScheduler.executedAt.toLocaleString("zh-TW", { hour12: false })} · ${latestScheduler.detail ?? "scheduler log"}`
            : "還沒有看到 scheduler 實際執行紀錄。"
        },
        {
          label: "可用 Threads 帳號",
          status: activeThreadsAccounts > 0 ? "pass" : "fail",
          detail: activeThreadsAccounts > 0 ? `目前有 ${activeThreadsAccounts} 個啟用中的 Threads 帳號。` : "目前沒有啟用中的 Threads 帳號。"
        },
        {
          label: "Threads token 健康",
          status: activeThreadsAccounts === 0 ? "check" : expiringThreadsTokens > 0 ? "check" : "pass",
          detail:
            activeThreadsAccounts === 0
              ? "還沒有可用帳號，所以暫時無法判斷 token 狀態。"
              : expiringThreadsTokens > 0
                ? `${expiringThreadsTokens} 個 Threads token 7 天內到期，最好先重授權。`
                : "目前啟用帳號的 Threads token 沒有接近到期。"
        },
        {
          label: "待發排程貼文",
          status: dueScheduledPosts > 0 ? "pass" : awaitingApprovalPosts > 0 ? "check" : "check",
          detail:
            dueScheduledPosts > 0
              ? `目前有 ${dueScheduledPosts} 篇已到時間、理論上該被 scheduler 處理。`
              : awaitingApprovalPosts > 0
                ? `目前沒有可直接送出的貼文，但有 ${awaitingApprovalPosts} 篇卡在人工審核。`
                : "目前沒有已到時間的排程貼文。"
        },
        {
          label: "最近 24 小時排程失敗",
          status: failedScheduledPosts === 0 ? "pass" : "check",
          detail:
            failedScheduledPosts === 0
              ? "最近 24 小時沒有看到 Threads 排程失敗紀錄。"
              : `最近 24 小時有 ${failedScheduledPosts} 篇排程貼文失敗，建議看失敗訊息。`
        }
      ];

      const readinessStatus: OpsDiagnostics["autoPublishReadiness"]["status"] =
        !hasThreadsEnv || !hasSchedulerPath || activeThreadsAccounts === 0
          ? "blocked"
          : !schedulerHealthy || expiringThreadsTokens > 0 || failedScheduledPosts > 0 || awaitingApprovalPosts > 0
            ? "degraded"
            : "ready";

      const readinessSummary =
        readinessStatus === "ready"
          ? "自動發文目前可正常運作"
          : readinessStatus === "degraded"
            ? "自動發文可跑，但有風險或人工節點"
            : "自動發文目前被阻塞";

      const readinessDetail =
        readinessStatus === "ready"
          ? dueScheduledPosts > 0
            ? `現在有 ${dueScheduledPosts} 篇到點貼文可由 scheduler 自動送出。`
            : "排程器、帳號與 token 都正常，目前只是沒有到點的待發貼文。"
          : readinessStatus === "degraded"
            ? [
                !schedulerHealthy ? "scheduler 最近沒有穩定執行" : null,
                expiringThreadsTokens > 0 ? "Threads token 即將到期" : null,
                awaitingApprovalPosts > 0 ? "有貼文卡在人工審核" : null,
                failedScheduledPosts > 0 ? "最近有排程失敗" : null
              ]
                .filter(Boolean)
                .join("，")
          : [
              !hasThreadsEnv ? "Threads env 不完整" : null,
              !hasSchedulerPath ? "沒有可用排程入口" : null,
              activeThreadsAccounts === 0 ? "沒有啟用中的 Threads 帳號" : null
            ]
              .filter(Boolean)
              .join("，");

      const autoPublishReadiness: OpsDiagnostics["autoPublishReadiness"] = {
        status: readinessStatus,
        summary: readinessSummary,
        detail: readinessDetail,
        counts: {
          activeThreadsAccounts,
          expiringThreadsTokens,
          dueScheduledPosts,
          awaitingApprovalPosts,
          failedScheduledPosts
        },
        checks: readinessChecks,
        latestActivity: [
          {
            label: "最近 Scheduler",
            value: latestScheduler ? latestScheduler.executedAt.toLocaleString("zh-TW", { hour12: false }) : "Never",
            detail: latestScheduler?.detail ?? "還沒有 scheduler 執行紀錄。",
            tone: !latestScheduler ? "bad" : schedulerHealthy ? "good" : "warn"
          },
          {
            label: "最近排程發文",
            value: latestScheduledPublish ? latestScheduledPublish.executedAt.toLocaleString("zh-TW", { hour12: false }) : "Never",
            detail: latestScheduledPublish
              ? `${latestScheduledPublish.actionType} · ${latestScheduledPublish.account ? `@${latestScheduledPublish.account.platformUsername}` : "未知帳號"} · ${latestScheduledPublish.detail ?? "已記錄"}`
              : "還沒有看到 Threads 排程發文紀錄。",
            tone:
              !latestScheduledPublish
                ? "warn"
                : latestScheduledPublish.status === "failed" || latestScheduledPublish.actionType === "threads_scheduled_failed"
                  ? "bad"
                  : "good"
          }
        ]
      };

      return {
        database: {
          ready: true,
          detail: process.env.DATABASE_URL ? `connected to ${maskConnectionString(process.env.DATABASE_URL)}` : "connected"
        },
        envChecks,
        records: {
          threadsAccounts,
          wordpressAccounts,
          posts,
          sourceWatches
        },
        aiHealth: {
          configured: {
            openai: Boolean(process.env.OPENAI_API_KEY),
            gemini: Boolean(process.env.GEMINI_API_KEY),
            claude: Boolean(process.env.ANTHROPIC_API_KEY)
          },
          gemini: {
            ok: geminiHealth.ok,
            model: geminiHealth.model,
            latencyMs: geminiHealth.latencyMs,
            message: geminiHealth.message
          }
        },
        schema: {
          looksDrifted,
          detail: looksDrifted ? "缺少部分新欄位，像是還沒跑最新 db:push。" : "目前抽查到的新欄位都已存在。",
          checks: schemaChecks
        },
        warnings,
        hints,
        threadsCallbackLogs: callbackLogs.map((log) => ({
          id: log.id,
          status: log.status,
          detail: log.detail ?? "threads callback log",
          executedAt: log.executedAt.toLocaleString("zh-TW", { hour12: false })
        })),
        runtimeChecks,
        runtimeLogs: runtimeLogs.map((log) => ({
          id: log.id,
          actionType: log.actionType,
          status: log.status,
          detail: log.detail ?? "runtime log",
          executedAt: log.executedAt.toLocaleString("zh-TW", { hour12: false })
        })),
        deployChecklist,
        autoPublishReadiness
      };
    } catch (error) {
      warnings.push("目前資料庫連線失敗，請先檢查 DATABASE_URL。");
      hints.push("先確認 Zeabur app service 的 `DATABASE_URL` 是否存在，且有綁到正確的 PostgreSQL addon。");

      return {
        database: {
          ready: false,
          detail: error instanceof Error ? error.message : "database connection failed"
        },
        envChecks,
        records: {
          threadsAccounts: 0,
          wordpressAccounts: 0,
          posts: 0,
          sourceWatches: 0
        },
        aiHealth: {
          configured: {
            openai: Boolean(process.env.OPENAI_API_KEY),
            gemini: Boolean(process.env.GEMINI_API_KEY),
            claude: Boolean(process.env.ANTHROPIC_API_KEY)
          },
          gemini: {
            ok: geminiHealth.ok,
            model: geminiHealth.model,
            latencyMs: geminiHealth.latencyMs,
            message: geminiHealth.message
          }
        },
        schema: {
          looksDrifted: false,
          detail: "資料庫目前連不上，還無法判斷 schema 是否落後。",
          checks: []
        },
        warnings,
        hints,
        threadsCallbackLogs: [],
        runtimeChecks: [],
        runtimeLogs: [],
        autoPublishReadiness: buildBlockedReadiness("資料庫目前連不上，所以還無法確認 scheduler、帳號、待發貼文與最近發文結果。"),
        deployChecklist: [
          {
            label: "DATABASE_URL / DB 連線",
            status: "fail",
            detail: "目前資料庫連不上，先不要部署。"
          },
          {
            label: "Schema 已同步",
            status: "check",
            detail: "資料庫目前連不上，還無法判斷是否需要 db:push。"
          },
          {
            label: "Threads 基本 env",
            status:
              process.env.THREADS_APP_ID && process.env.THREADS_APP_SECRET && process.env.THREADS_REDIRECT_URI && process.env.TOKEN_ENCRYPTION_KEY
                ? "pass"
                : "fail",
            detail:
              process.env.THREADS_APP_ID && process.env.THREADS_APP_SECRET && process.env.THREADS_REDIRECT_URI && process.env.TOKEN_ENCRYPTION_KEY
                ? "Threads OAuth 需要的基本變數已存在。"
                : "Threads OAuth 需要的 env 不完整。"
          },
          {
            label: "AI Provider 健康",
            status:
              geminiHealth.ok || Boolean(process.env.OPENAI_API_KEY) || Boolean(process.env.ANTHROPIC_API_KEY)
                ? geminiHealth.ok
                  ? "pass"
                  : "check"
                : "fail",
            detail:
              geminiHealth.ok
                ? `Gemini 可用，模型 ${geminiHealth.model ?? "n/a"}。`
                : Boolean(process.env.OPENAI_API_KEY) || Boolean(process.env.ANTHROPIC_API_KEY)
                  ? "Gemini 健康檢查未過，但仍有其他 AI provider 可作為備援。"
                  : "目前沒有可用的 AI provider。"
          },
          {
            label: "Inngest / 排程",
            status:
              process.env.INNGEST_EVENT_KEY && process.env.INNGEST_SIGNING_KEY && process.env.INNGEST_SERVE_ORIGIN
                ? "pass"
                : "check",
            detail:
              process.env.INNGEST_EVENT_KEY && process.env.INNGEST_SIGNING_KEY && process.env.INNGEST_SERVE_ORIGIN
                ? "Inngest 主要 env 已存在。"
                : "Inngest env 不完整，手動功能可用，但排程可能不穩。"
          },
          {
            label: "External cron fallback",
            status: process.env.CRON_SECRET ? "pass" : "check",
            detail: process.env.CRON_SECRET
              ? "已可安全呼叫 `/api/cron/heartbeat` 或 `/api/cron/scheduler` 當作排程備援。"
              : "尚未設定 CRON_SECRET，外部 cron 備援還沒建立。"
          },
          {
            label: "已有 Threads 帳號",
            status: "check",
            detail: "資料庫目前連不上，暫時無法確認帳號狀態。"
          }
        ]
      };
    }
  });
}
