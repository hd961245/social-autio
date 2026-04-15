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
  warnings: string[];
  hints: string[];
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

  try {
    const [threadsAccounts, wordpressAccounts, posts, sourceWatches] = await Promise.all([
      prisma.platformAccount.count({ where: { platform: "threads" } }),
      prisma.platformAccount.count({ where: { platform: "wordpress" } }),
      prisma.post.count(),
      prisma.sourceWatch.count()
    ]);

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

    if (process.env.DATABASE_URL && (threadsAccounts > 0 || wordpressAccounts > 0)) {
      hints.push("目前資料庫裡有帳號資料，若前台仍看不到，優先檢查是不是看錯 project / environment 或 session 狀態。");
    }

    if (process.env.DATABASE_URL && threadsAccounts === 0 && wordpressAccounts === 0 && posts === 0) {
      hints.push("這份環境很像是 schema 已建好但資料為空的全新資料庫。不要急著重連帳號，先確認是不是接錯 DB。");
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
      warnings,
      hints
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
      warnings,
      hints
    };
  }
}
