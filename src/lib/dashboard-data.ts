import { prisma } from "@/lib/prisma";

export type AccountSummary = {
  id: string;
  username: string;
  platform: string;
  tokenStatus: "healthy" | "expiring";
  lastSyncedAt: string;
  followers: number;
  weeklyViews: number;
};

export type PostSummary = {
  id: string;
  account: string;
  status: string;
  scheduledAt: string;
  text: string;
  platformUrl?: string | null;
};

export type KeywordHitSummary = {
  id: string;
  keyword: string;
  author: string;
  matchedAt: string;
  actionTaken: string;
  excerpt: string;
};

export type ActiveAccountSummary = {
  username: string;
  platform: string;
  lastSyncedAt: string;
} | null;

function formatDate(value?: Date | null) {
  if (!value) {
    return "尚未同步";
  }

  return value.toLocaleString("zh-TW", { hour12: false });
}

function getTokenStatus(tokenExpiresAt: Date) {
  return tokenExpiresAt.getTime() <= Date.now() + 7 * 24 * 60 * 60 * 1000 ? "expiring" : "healthy";
}

export async function getAccountSummaries(): Promise<AccountSummary[]> {
  const accounts = await prisma.platformAccount.findMany({
    include: {
      metricsSnapshots: {
        orderBy: {
          capturedAt: "desc"
        },
        take: 1
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return accounts.map((account) => {
    const latestMetrics = account.metricsSnapshots[0];

    return {
      id: account.id,
      username: `@${account.platformUsername}`,
      platform: account.platform[0]?.toUpperCase() + account.platform.slice(1),
      tokenStatus: getTokenStatus(account.tokenExpiresAt),
      lastSyncedAt: formatDate(account.lastSyncedAt),
      followers: latestMetrics?.followerCount ?? 0,
      weeklyViews: latestMetrics?.totalViews ?? 0
    };
  });
}

export async function getActiveAccountSummary(): Promise<ActiveAccountSummary> {
  try {
    const account = await prisma.platformAccount.findFirst({
      where: {
        isActive: true
      },
      orderBy: [{ lastSyncedAt: "desc" }, { createdAt: "desc" }]
    });

    if (!account) {
      return null;
    }

    return {
      username: `@${account.platformUsername}`,
      platform: account.platform[0]?.toUpperCase() + account.platform.slice(1),
      lastSyncedAt: formatDate(account.lastSyncedAt)
    };
  } catch {
    return null;
  }
}

export async function getDashboardStats() {
  const [accountCount, postCount, publishedCount, keywordCount, queuedPosts] = await Promise.all([
    prisma.platformAccount.count({ where: { isActive: true } }),
    prisma.post.count(),
    prisma.post.count({ where: { status: "published" } }),
    prisma.keywordMatch.count(),
    prisma.post.count({ where: { status: { in: ["scheduled", "publishing"] } } })
  ]);

  return [
    {
      label: "活躍帳號",
      value: String(accountCount),
      detail: accountCount > 0 ? "已連接 Threads 帳號" : "尚未完成帳號授權"
    },
    {
      label: "貼文總數",
      value: String(postCount),
      detail: publishedCount > 0 ? `已發布 ${publishedCount} 篇` : "還沒有成功發布紀錄"
    },
    {
      label: "排程佇列",
      value: String(queuedPosts),
      detail: queuedPosts > 0 ? "待 cron 處理" : "目前沒有待發布貼文"
    },
    {
      label: "關鍵字命中",
      value: String(keywordCount),
      detail: keywordCount > 0 ? "可進一步串自動化規則" : "尚未掃到命中資料"
    }
  ];
}

export async function getPostSummaries(): Promise<PostSummary[]> {
  const posts = await prisma.post.findMany({
    include: {
      account: true
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 20
  });

  return posts.map((post) => ({
    id: post.id,
    account: `@${post.account.platformUsername}`,
    status: post.status,
    scheduledAt: formatDate(post.scheduledAt ?? post.createdAt),
    text: post.textContent ?? "(無文字內容)",
    platformUrl: post.platformUrl
  }));
}

export async function getKeywordHitSummaries(): Promise<KeywordHitSummary[]> {
  const hits = await prisma.keywordMatch.findMany({
    include: {
      keyword: true
    },
    orderBy: {
      matchedAt: "desc"
    },
    take: 10
  });

  return hits.map((hit) => ({
    id: hit.id,
    keyword: hit.keyword.keyword,
    author: hit.authorUsername,
    matchedAt: formatDate(hit.matchedAt),
    actionTaken: hit.actionTaken ?? "none",
    excerpt: hit.postText
  }));
}
