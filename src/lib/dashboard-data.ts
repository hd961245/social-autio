import { prisma } from "@/lib/prisma";

export type AccountSummary = {
  id: string;
  username: string;
  platform: string;
  personaLabel?: string;
  defaultTone?: string;
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

export type ThreadMetricTimelinePoint = {
  label: string;
  views: number;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
  shares: number;
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

export type ComposeHealth = {
  threadsReady: boolean;
  threadsMessage: string;
  tokenStatus: "healthy" | "expiring" | "missing";
  tokenMessage: string;
  queueCount: number;
  queueMessage: string;
};

export type AnalyticsOverview = {
  filters: {
    window: "7d" | "30d" | "all";
    accountId: string;
    accountOptions: Array<{ id: string; label: string }>;
  };
  followerTrend: Array<{ label: string; followers: number; engagement: number }>;
  totals: {
    views: number;
    likes: number;
    replies: number;
    reposts: number;
    quotes: number;
    shares: number;
  };
  benchmarks: Array<{
    label: string;
    value: string;
    detail: string;
  }>;
  topPosts: Array<{
    id: string;
    text: string;
    views: number;
    likes: number;
    replies: number;
    reposts: number;
    quotes: number;
    shares: number;
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

export type ThreadPostDeepDive = {
  id: string;
  account: string;
  text: string;
  platformUrl: string | null;
  publishedAt: string;
  latest: {
    views: number;
    likes: number;
    replies: number;
    reposts: number;
    quotes: number;
    shares: number;
  };
  health: {
    engagementRate: number;
    conversationRate: number;
    amplificationRate: number;
    momentum: "spiking" | "steady" | "cooling";
    momentumLabel: string;
  };
  insights: string[];
  nextAction: string;
  timeline: ThreadMetricTimelinePoint[];
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function toPercent(value: number) {
  return `${(value * 100).toFixed(value >= 0.1 ? 0 : 1)}%`;
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

function summarizePostHealth(input: {
  text: string;
  latest: {
    views: number;
    likes: number;
    replies: number;
    reposts: number;
    quotes: number;
    shares: number;
  };
  history: Array<{
    views: number;
    likes: number;
    replies: number;
    reposts: number;
    quotes: number;
    shares: number;
  }>;
}) {
  const { latest, history, text } = input;
  const engagementRate =
    latest.views > 0 ? (latest.likes + latest.replies + latest.reposts + latest.quotes + latest.shares) / latest.views : 0;
  const conversationRate = latest.views > 0 ? (latest.replies + latest.quotes) / latest.views : 0;
  const amplificationRate = latest.views > 0 ? (latest.reposts + latest.quotes + latest.shares) / latest.views : 0;
  const previous = history.at(-2);
  const first = history[0];
  const latestViewDelta = previous ? latest.views - previous.views : latest.views;
  const previousViewDelta = history.length >= 3 ? history.at(-2)!.views - history.at(-3)!.views : latestViewDelta;
  const totalGrowth = first ? latest.views - first.views : latest.views;
  const textLength = text.trim().length;

  let momentum: "spiking" | "steady" | "cooling" = "steady";
  if (latestViewDelta > 0 && latestViewDelta >= previousViewDelta * 1.15) {
    momentum = "spiking";
  } else if (latestViewDelta <= 0 || (previousViewDelta > 0 && latestViewDelta <= previousViewDelta * 0.55)) {
    momentum = "cooling";
  }

  const insights: string[] = [];

  if (engagementRate >= 0.12) {
    insights.push(`整體互動率來到 ${toPercent(engagementRate)}，這篇已經不只是被看見，是真的有被接住。`);
  } else if (engagementRate >= 0.06) {
    insights.push(`互動率約 ${toPercent(engagementRate)}，屬於可以再推一次的穩定素材。`);
  } else {
    insights.push(`互動率目前約 ${toPercent(engagementRate)}，更適合先重寫 hook 或切角再測。`);
  }

  if (conversationRate >= 0.03) {
    insights.push(`留言加引用比例有 ${toPercent(conversationRate)}，很適合延伸成觀點文或系列回應。`);
  } else if (amplificationRate >= 0.02) {
    insights.push(`轉發擴散比例約 ${toPercent(amplificationRate)}，比較像值得二次分發的內容。`);
  } else {
    insights.push("目前擴散和對話都偏保守，先補更鮮明的立場或數字證據會比較有效。");
  }

  if (momentum === "spiking") {
    insights.push(`最新一段觀看增量還在加速，從首個快照到現在多了 ${Math.max(totalGrowth, 0)} views，值得趁熱再發一次。`);
  } else if (momentum === "cooling") {
    insights.push("熱度已經開始放慢，適合改寫成另一個角度，而不是原句再發一次。");
  } else {
    insights.push("這篇屬於穩定累積型，可以用更精煉的版本再打一輪。");
  }

  if (textLength > 260) {
    insights.push("文案本體偏長，下一版建議把第一屏壓得更狠一點。");
  } else if (textLength < 55) {
    insights.push("文案略短，下一版可以多補一個具體案例或數字，讓記憶點更強。");
  }

  let nextAction = "保留觀點，重寫第一句 hook，做成更俐落的 Threads 二次版本。";
  if (momentum === "spiking" && amplificationRate >= 0.02) {
    nextAction = "這篇還在往上，優先延伸成系列文，並同步整理成 WordPress draft。";
  } else if (conversationRate >= 0.03) {
    nextAction = "把留言與引用裡的爭議點拉出來，寫成下一篇立場更鮮明的 follow-up。";
  } else if (engagementRate < 0.05) {
    nextAction = "不要直接重發原句，先換切角、加案例，再重新測試。";
  }

  return {
    engagementRate,
    conversationRate,
    amplificationRate,
    momentum,
    momentumLabel:
      momentum === "spiking" ? "還在加速" : momentum === "cooling" ? "熱度轉冷" : "穩定累積",
    insights: insights.slice(0, 4),
    nextAction
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
      where: {
        platform: "threads"
      },
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
        personaLabel: account.personaLabel ?? undefined,
        defaultTone: account.defaultTone ?? undefined,
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
        isActive: true,
        platform: "threads"
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

export async function getAnalyticsOverview(input?: {
  window?: "7d" | "30d" | "all";
  accountId?: string;
}): Promise<AnalyticsOverview> {
  try {
    const window = input?.window ?? "30d";
    const since =
      window === "7d" ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      : window === "30d" ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      : null;

    const [accounts, activeAccount] = await Promise.all([
      prisma.platformAccount.findMany({
        where: { platform: "threads" },
        orderBy: [{ isActive: "desc" }, { createdAt: "asc" }]
      }),
      prisma.platformAccount.findFirst({
        where: { isActive: true, platform: "threads" },
        orderBy: { lastSyncedAt: "desc" }
      })
    ]);

    const requestedAccountId = input?.accountId ?? "all";
    const scopedAccountId =
      requestedAccountId !== "all" && accounts.some((account) => account.id === requestedAccountId) ? requestedAccountId : "all";

    const [snapshots, posts, account] = await Promise.all([
      prisma.metricsSnapshot.findMany({
        where: {
          ...(since ? { capturedAt: { gte: since } } : {}),
          ...(scopedAccountId !== "all" ? { accountId: scopedAccountId } : {})
        },
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
          status: "published",
          ...(since ? { publishedAt: { gte: since } } : {}),
          ...(scopedAccountId !== "all" ? { accountId: scopedAccountId } : {})
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
        take: 12
      }),
      prisma.platformAccount.findFirst({
        where: {
          isActive: true,
          ...(scopedAccountId !== "all" ? { id: scopedAccountId } : {}),
          platform: "threads"
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

    const rankedPosts = posts
      .map((post) => ({
        id: post.id,
        text: post.textContent ?? "(無文字內容)",
        views: post.metrics[0]?.views ?? 0,
        likes: post.metrics[0]?.likes ?? 0,
        replies: post.metrics[0]?.replies ?? 0,
        reposts: post.metrics[0]?.reposts ?? 0,
        quotes: post.metrics[0]?.quotes ?? 0,
        shares: post.metrics[0]?.shares ?? 0,
        account: `@${post.account.platformUsername}`
      }))
      .sort((a, b) => {
        const scoreA = a.views + a.likes * 8 + a.replies * 10 + a.reposts * 12 + a.quotes * 12 + a.shares * 14;
        const scoreB = b.views + b.likes * 8 + b.replies * 10 + b.reposts * 12 + b.quotes * 12 + b.shares * 14;
        return scoreB - scoreA;
      });

    const benchmarkBase = posts.reduce(
      (acc, post) => {
        const metric = post.metrics[0];

        if (!metric || metric.views <= 0) {
          return acc;
        }

        acc.postsTracked += 1;
        acc.engagementRate +=
          (metric.likes + metric.replies + metric.reposts + metric.quotes + metric.shares) / metric.views;
        acc.conversationRate += (metric.replies + metric.quotes) / metric.views;
        acc.amplificationRate += (metric.reposts + metric.quotes + metric.shares) / metric.views;
        return acc;
      },
      { postsTracked: 0, engagementRate: 0, conversationRate: 0, amplificationRate: 0 }
    );

    return {
      filters: {
        window,
        accountId: scopedAccountId,
        accountOptions: [
          { id: "all", label: "全部帳號" },
          ...accounts.map((account) => ({
            id: account.id,
            label: `@${account.platformUsername}${activeAccount?.id === account.id ? " · active" : ""}`
          }))
        ]
      },
      followerTrend: snapshots.map((snapshot) => ({
        label: snapshot.capturedAt.toLocaleDateString("zh-TW", { month: "numeric", day: "numeric" }),
        followers: snapshot.followerCount,
        engagement:
          snapshot.totalLikes + snapshot.totalReplies + snapshot.totalReposts + snapshot.totalQuotes
      })),
      totals: posts.reduce(
        (acc, post) => ({
          views: acc.views + (post.metrics[0]?.views ?? 0),
          likes: acc.likes + (post.metrics[0]?.likes ?? 0),
          replies: acc.replies + (post.metrics[0]?.replies ?? 0),
          reposts: acc.reposts + (post.metrics[0]?.reposts ?? 0),
          quotes: acc.quotes + (post.metrics[0]?.quotes ?? 0),
          shares: acc.shares + (post.metrics[0]?.shares ?? 0)
        }),
        { views: 0, likes: 0, replies: 0, reposts: 0, quotes: 0, shares: 0 }
      ),
      benchmarks: [
        {
          label: "Tracked Posts",
          value: String(benchmarkBase.postsTracked),
          detail: "最近拿來判讀的已發布 Threads 篇數"
        },
        {
          label: "Avg Engagement",
          value: benchmarkBase.postsTracked ? toPercent(benchmarkBase.engagementRate / benchmarkBase.postsTracked) : "0%",
          detail: "按讚、留言、轉發、引用、分享相對於觀看的平均值"
        },
        {
          label: "Conversation Rate",
          value: benchmarkBase.postsTracked ? toPercent(benchmarkBase.conversationRate / benchmarkBase.postsTracked) : "0%",
          detail: "留言與引用比重，越高越適合延伸觀點"
        },
        {
          label: "Amplification Rate",
          value: benchmarkBase.postsTracked ? toPercent(benchmarkBase.amplificationRate / benchmarkBase.postsTracked) : "0%",
          detail: "轉發、引用、分享比重，越高越值得二次分發"
        }
      ],
      topPosts: rankedPosts.slice(0, 6),
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
      filters: {
        window: input?.window ?? "30d",
        accountId: "all",
        accountOptions: [{ id: "all", label: "全部帳號" }]
      },
      followerTrend: [],
      totals: { views: 0, likes: 0, replies: 0, reposts: 0, quotes: 0, shares: 0 },
      benchmarks: [],
      topPosts: [],
      viralCandidates: [],
      quota: { used: 0, limit: 250 },
      tokenWarning: null
    };
  }
}

export async function getDashboardStats() {
  try {
    const [accountCount, postCount, publishedCount, keywordCount, queuedPosts, latestPostMetrics] = await Promise.all([
      prisma.platformAccount.count({ where: { isActive: true, platform: "threads" } }),
      prisma.post.count(),
      prisma.post.count({ where: { status: "published" } }),
      prisma.keywordMatch.count(),
      prisma.post.count({ where: { status: { in: ["scheduled", "publishing"] } } }),
      prisma.postMetrics.findMany({
        orderBy: { capturedAt: "desc" },
        take: 20
      })
    ]);

    const totalViews = latestPostMetrics.reduce((sum, metric) => sum + metric.views, 0);

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
        label: "總觀看",
        value: String(totalViews),
        detail: totalViews > 0 ? "最近收集到的貼文 views 總量" : "還沒有 metrics 資料"
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
      { label: "總觀看", value: "0", detail: "還沒有 metrics 資料" },
      { label: "排程佇列", value: "0", detail: "目前沒有待發布貼文" },
      { label: "關鍵字命中", value: "0", detail: "尚未掃到命中資料" }
    ];
  }
}

export async function getComposeHealth(): Promise<ComposeHealth> {
  try {
    const [threadsAccount, scheduledCount] = await Promise.all([
      prisma.platformAccount.findFirst({
        where: { isActive: true, platform: "threads" },
        orderBy: [{ lastSyncedAt: "desc" }, { createdAt: "desc" }]
      }),
      prisma.post.count({
        where: {
          status: "scheduled",
          account: {
            platform: "threads"
          }
        }
      })
    ]);

    if (!threadsAccount) {
      return {
        threadsReady: false,
        threadsMessage: "尚未連接可用的 Threads 帳號",
        tokenStatus: "missing",
        tokenMessage: "沒有 Threads token 可用",
        queueCount: scheduledCount,
        queueMessage: scheduledCount > 0 ? `目前有 ${scheduledCount} 筆 Threads 排程待送出` : "目前沒有待送出的 Threads 排程"
      };
    }

    const expiringSoon = threadsAccount.tokenExpiresAt.getTime() <= Date.now() + 7 * 24 * 60 * 60 * 1000;

    return {
      threadsReady: true,
      threadsMessage: `目前可用帳號：@${threadsAccount.platformUsername}`,
      tokenStatus: expiringSoon ? "expiring" : "healthy",
      tokenMessage: expiringSoon ? "Threads token 7 天內將到期，建議儘快重新授權" : "Threads token 狀態正常",
      queueCount: scheduledCount,
      queueMessage: scheduledCount > 0 ? `目前有 ${scheduledCount} 筆 Threads 排程待送出` : "目前沒有待送出的 Threads 排程"
    };
  } catch {
    return {
      threadsReady: false,
      threadsMessage: "目前無法讀取發佈狀態",
      tokenStatus: "missing",
      tokenMessage: "尚未讀到 token 狀態",
      queueCount: 0,
      queueMessage: "尚未讀到排程資料"
    };
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

export async function getThreadPostDeepDive(postId: string): Promise<ThreadPostDeepDive | null> {
  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        account: true,
        metrics: {
          orderBy: {
            capturedAt: "asc"
          }
        }
      }
    });

    if (!post || post.account.platform !== "threads") {
      return null;
    }

    const latest = post.metrics.at(-1);
    const timeline: ThreadMetricTimelinePoint[] = post.metrics.map((metric) => ({
      label: metric.capturedAt.toLocaleString("zh-TW", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      }),
      views: metric.views,
      likes: metric.likes,
      replies: metric.replies,
      reposts: metric.reposts,
      quotes: metric.quotes,
      shares: metric.shares
    }));

    const latestMetrics = {
      views: latest?.views ?? 0,
      likes: latest?.likes ?? 0,
      replies: latest?.replies ?? 0,
      reposts: latest?.reposts ?? 0,
      quotes: latest?.quotes ?? 0,
      shares: latest?.shares ?? 0
    };
    const health = summarizePostHealth({
      text: post.textContent ?? post.title ?? "(無文字內容)",
      latest: latestMetrics,
      history: post.metrics.map((metric) => ({
        views: metric.views,
        likes: metric.likes,
        replies: metric.replies,
        reposts: metric.reposts,
        quotes: metric.quotes,
        shares: metric.shares
      }))
    });

    return {
      id: post.id,
      account: `@${post.account.platformUsername}`,
      text: post.textContent ?? post.title ?? "(無文字內容)",
      platformUrl: post.platformUrl,
      publishedAt: formatDate(post.publishedAt ?? post.createdAt),
      latest: latestMetrics,
      health: {
        engagementRate: health.engagementRate,
        conversationRate: health.conversationRate,
        amplificationRate: health.amplificationRate,
        momentum: health.momentum,
        momentumLabel: health.momentumLabel
      },
      insights: health.insights,
      nextAction: health.nextAction,
      timeline
    };
  } catch {
    return null;
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
