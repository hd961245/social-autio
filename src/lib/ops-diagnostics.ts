import { runGeminiHealthCheck } from "@/lib/ai/health";
import { prisma } from "@/lib/prisma";

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
  const envChecks: EnvCheck[] = [
    checkEnv("DATABASE_URL", process.env.DATABASE_URL, { mask: true }),
    checkEnv("ADMIN_PASSWORD", process.env.ADMIN_PASSWORD),
    checkEnv("ADMIN_SESSION_SECRET", process.env.ADMIN_SESSION_SECRET),
    checkEnv("THREADS_APP_ID", process.env.THREADS_APP_ID),
    checkEnv("THREADS_APP_SECRET", process.env.THREADS_APP_SECRET),
    checkEnv("THREADS_REDIRECT_URI", process.env.THREADS_REDIRECT_URI),
    checkEnv("TOKEN_ENCRYPTION_KEY", process.env.TOKEN_ENCRYPTION_KEY),
    checkEnv("INNGEST_EVENT_KEY", process.env.INNGEST_EVENT_KEY),
    checkEnv("INNGEST_SIGNING_KEY", process.env.INNGEST_SIGNING_KEY),
    checkEnv("INNGEST_SERVE_ORIGIN", process.env.INNGEST_SERVE_ORIGIN)
  ];

  const warnings: string[] = [];
  const hints: string[] = [];
  const geminiHealth = await runGeminiHealthCheck();

  try {
    const [threadsAccounts, wordpressAccounts, posts, sourceWatches, schemaRows] = await Promise.all([
      prisma.platformAccount.count({ where: { platform: "threads" } }),
      prisma.platformAccount.count({ where: { platform: "wordpress" } }),
      prisma.post.count(),
      prisma.sourceWatch.count(),
      prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
        `select column_name
         from information_schema.columns
         where table_name = 'AppSettings'
           and column_name in ('editorialDirection', 'editorialGoal')`
      )
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
    const schemaColumns = new Set(schemaRows.map((row) => row.column_name));
    const schemaChecks = ["editorialDirection", "editorialGoal"].map((column) => ({
      column,
      status: schemaColumns.has(column) ? ("present" as const) : ("missing" as const)
    }));
    const looksDrifted = schemaChecks.some((check) => check.status === "missing");

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
      }))
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
      threadsCallbackLogs: []
    };
  }
}
