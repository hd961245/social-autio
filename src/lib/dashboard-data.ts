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
  accountId: string;
  platform: string;
  status: string;
  scheduledAt: string;
  text: string;
  title?: string | null;
  platformUrl?: string | null;
};

export type KeywordHitSummary = {
  id: string;
  keyword: string;
  author: string;
  matchedAt: string;
  actionTaken: string;
  excerpt: string;
  sourcePostId?: string | null;
  accountId?: string | null;
  actionPostId?: string | null;
};

export type AutomationLogSummary = {
  id: string;
  ruleName: string;
  actionType: string;
  status: string;
  detail: string;
  executedAt: string;
};

export type ActiveAccountSummary = {
  username: string;
  platform: string;
  lastSyncedAt: string;
} | null;

export type DatabaseStatus = {
  ready: boolean;
  message: string;
};

export type AnalyticsOverview = {
  followerTrend: Array<{ label: string; followers: number; engagement: number }>;
  topPosts: Array<{
    id: string;
    text: string;
    views: number;
    likes: number;
    replies: number;
    account: string;
  }>;
  viralCandidates: Array<{
    id: string;
    text: string;
    account: string;
    score: number;
    label: "high" | "medium" | "low";
    reasons: string[];
    suggestion: string;
  }>;
  quota: {
    used: number;
    limit: number;
  };
  tokenWarning: string | null;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getViralLabel(score: number): "high" | "medium" | "low" {
  if (score >= 75) {
    return "high";
  }

  if (score >= 50) {
    return "medium";
  }

  return "low";
}

function analyzeViralPotential(input: {
  text: string;
  views: number;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
}) {
  const text = input.text.trim();
  const likesPerView = input.views > 0 ? input.likes / input.views : 0;
  const conversationRate = input.views > 0 ? (input.replies + input.quotes) / input.views : 0;
  const shareSignal = input.views > 0 ? (input.reposts + input.quotes) / input.views : 0;
  const hasHook = /^(為什麼|怎麼|如何|別再|不要|其實|你可能|我發現|這 3|這三|先說結論)/.test(text);
  const hasNumbers = /\d/.test(text);
  const hasLineBreaks = text.includes("\n");
  const shortEnough = text.length >= 60 && text.length <= 220;

  let score = 35;
  const reasons: string[] = [];

  if (likesPerView >= 0.08) {
    score += 18;
    reasons.push("按讚率高，代表第一眼吸引力不錯");
  } else if (likesPerView >= 0.04) {
    score += 10;
    reasons.push("按讚率穩定，有放大的空間");
  }

  if (conversationRate >= 0.03) {
    score += 18;
    reasons.push("留言/引用比例高，容易引發討論");
  } else if (conversationRate >= 0.015) {
    score += 10;
    reasons.push("互動有起來，適合再補強觀點");
  }

  if (shareSignal >= 0.015) {
    score += 12;
    reasons.push("轉發訊號不錯，具備擴散潛力");
  }

  if (hasHook) {
    score += 8;
    reasons.push("開頭像 hook，容易讓人停下來看");
  }

  if (hasNumbers) {
    score += 6;
    reasons.push("文案裡有數字，通常更容易被記住");
  }

  if (hasLineBreaks) {
    score += 4;
    reasons.push("段落節奏清楚，閱讀阻力較低");
  }

  if (shortEnough) {
    score += 6;
    reasons.push("篇幅落在 Threads 常見的好讀區間");
  } else if (text.length > 320) {
    score -= 10;
    reasons.push("文案偏長，首屏吸引力可能被稀釋");
  } else if (text.length < 30) {
    score -= 8;
    reasons.push("文案偏短，資訊密度可能不夠");
  }

  const label = getViralLabel(clamp(score, 0, 100));
  const suggestion =
    label === "high"
      ? "可以優先二次分發，延伸成系列文或短影片腳本。"
      : label === "medium"
        ? "建議重寫第一句 hook，並補一個更強的結論或立場。"
        : "先補清楚觀點、數字或反直覺切角，再測一次。";

  return {
    score: clamp(score, 0, 100),
    label,
    reasons: reasons.slice(0, 3),
    suggestion
  };
}

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
  try {
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
  } catch {
    return [];
  }
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

export async function getDatabaseStatus(): Promise<DatabaseStatus> {
  try {
    await prisma.user.count();
    return {
      ready: true,
      message: "資料庫已連線"
    };
  } catch {
    return {
      ready: false,
      message: "資料庫尚未初始化，請在 Zeabur 執行 npm run db:push"
    };
  }
}

export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  try {
    const [snapshots, posts, account] = await Promise.all([
      prisma.metricsSnapshot.findMany({
        include: {
          account: true
        },
        orderBy: {
          capturedAt: "asc"
        },
        take: 7
      }),
      prisma.post.findMany({
        where: {
          status: "published"
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
        take: 5
      }),
      prisma.platformAccount.findFirst({
        where: {
          isActive: true
        },
        orderBy: {
          lastSyncedAt: "desc"
        }
      })
    ]);

    let quota = { used: 0, limit: 250 };

    if (account) {
      try {
        quota = await (await import("@/lib/platforms")).getPlatformAdapter("threads").getPublishingQuota(account.id);
      } catch {}
    }

    return {
      followerTrend: snapshots.map((snapshot) => ({
        label: snapshot.capturedAt.toLocaleDateString("zh-TW", { month: "numeric", day: "numeric" }),
        followers: snapshot.followerCount,
        engagement:
          snapshot.totalLikes + snapshot.totalReplies + snapshot.totalReposts + snapshot.totalQuotes
      })),
      topPosts: posts.map((post) => ({
        id: post.id,
        text: post.textContent ?? "(無文字內容)",
        views: post.metrics[0]?.views ?? 0,
        likes: post.metrics[0]?.likes ?? 0,
        replies: post.metrics[0]?.replies ?? 0,
        account: `@${post.account.platformUsername}`
      })),
      viralCandidates: posts.map((post) => {
        const analysis = analyzeViralPotential({
          text: post.textContent ?? post.title ?? "(無文字內容)",
          views: post.metrics[0]?.views ?? 0,
          likes: post.metrics[0]?.likes ?? 0,
          replies: post.metrics[0]?.replies ?? 0,
          reposts: post.metrics[0]?.reposts ?? 0,
          quotes: post.metrics[0]?.quotes ?? 0
        });

        return {
          id: post.id,
          text: post.textContent ?? post.title ?? "(無文字內容)",
          account: `@${post.account.platformUsername}`,
          score: analysis.score,
          label: analysis.label,
          reasons: analysis.reasons,
          suggestion: analysis.suggestion
        };
      }).sort((a, b) => b.score - a.score),
      quota,
      tokenWarning:
        account && account.tokenExpiresAt.getTime() <= Date.now() + 7 * 24 * 60 * 60 * 1000
          ? `帳號 ${account.platformUsername} 的 token 即將在 7 天內到期`
          : null
    };
  } catch {
    return {
      followerTrend: [],
      topPosts: [],
      viralCandidates: [],
      quota: { used: 0, limit: 250 },
      tokenWarning: null
    };
  }
}

export async function getDashboardStats() {
  try {
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
  } catch {
    return [
      { label: "活躍帳號", value: "0", detail: "資料庫尚未初始化或尚未完成帳號授權" },
      { label: "貼文總數", value: "0", detail: "目前沒有可讀取的貼文紀錄" },
      { label: "排程佇列", value: "0", detail: "目前沒有待發布貼文" },
      { label: "關鍵字命中", value: "0", detail: "尚未掃到命中資料" }
    ];
  }
}

export async function getPostSummaries(): Promise<PostSummary[]> {
  try {
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
      accountId: post.accountId,
      platform: post.account.platform,
      status: post.status,
      scheduledAt: formatDate(post.scheduledAt ?? post.createdAt),
      text: post.title ?? post.textContent ?? "(無文字內容)",
      title: post.title,
      platformUrl: post.platformUrl
    }));
  } catch {
    return [];
  }
}

export async function getKeywordHitSummaries(): Promise<KeywordHitSummary[]> {
  try {
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
      excerpt: hit.postText,
      sourcePostId: hit.sourcePostId,
      accountId: hit.accountId,
      actionPostId: hit.actionPostId
    }));
  } catch {
    return [];
  }
}

export async function getAutomationLogSummaries(): Promise<AutomationLogSummary[]> {
  try {
    const logs = await prisma.automationLog.findMany({
      include: {
        rule: true
      },
      orderBy: {
        executedAt: "desc"
      },
      take: 8
    });

    return logs.map((log) => ({
      id: log.id,
      ruleName: log.rule?.name ?? "Manual action",
      actionType: log.actionType,
      status: log.status,
      detail: log.detail ?? "已記錄動作",
      executedAt: formatDate(log.executedAt)
    }));
  } catch {
    return [];
  }
}
