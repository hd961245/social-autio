import { prisma } from "@/lib/prisma";
import { getPlatformAdapter } from "@/lib/platforms";
import { getEffectiveAutopilotMode, isAutopilotEnabledForAccount } from "@/lib/automation/account-autopilot";
import { inferBestScheduleTime } from "@/lib/automation/autopilot-timing";
import { getGscOpportunityQueue } from "@/lib/gsc";
import {
  getMissionDraftBoost,
  getMissionLongformBoost,
  summarizeMissionStrategy,
  type MissionContext
} from "@/lib/mission-scoring";

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

export type AccountOperatingSummary = AccountSummary & {
  autopilotEnabled: boolean;
  autoGenerateMode: "draft" | "scheduled";
  accountMission: string;
  sourcePreference: string;
  laneHint: string;
  todayPublishedCount: number;
  todayScheduledCount: number;
  directDraftCount: number;
  reviewDraftCount: number;
  optimizationDraftCount: number;
  wordpressDraftCount: number;
  wordpressExpansionCount: number;
  exceptionCount: number;
  needsDailyPost: boolean;
  latestPublishedAt?: string;
};

export type PostSummary = {
  id: string;
  account: string;
  accountId: string;
  platform: string;
  personaLabel?: string;
  topicTag?: string | null;
  candidateRationale?: string | null;
  isFreshToday?: boolean;
  reviewScore?: number;
  reviewLane?: "direct" | "review";
  laneReason?: string | null;
  missionReason?: string | null;
  suggestedScheduleLabel?: string | null;
  suggestedCta?: string | null;
  status: string;
  requiresApproval?: boolean;
  approvalState?: string | null;
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

export type WorkspaceTopbarSnapshot = {
  activeAccount: ActiveAccountSummary;
  exceptionLabel: string;
  todayPublished: number;
  pendingReview: number;
  activeAccounts: number;
  automationPaused: boolean;
};

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
  aiReady: boolean;
  aiMessage: string;
};

export type PublishOutcomeSummary = {
  id: string;
  actionType: string;
  status: string;
  detail: string;
  executedAt: string;
  accountLabel: string;
  postHref: string;
};

export type AnalyticsOverview = {
  filters: {
    window: "7d" | "30d" | "all";
    accountId: string;
    accountOptions: Array<{ id: string; label: string; personaLabel?: string }>;
  };
  personaSnapshot: {
    label: string;
    tone: string;
    patternNote: string;
    recommendedMove: string;
  } | null;
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
    personaLabel?: string;
  }>;
  viralCandidates: Array<{
    id: string;
    text: string;
    account: string;
    personaLabel?: string;
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
  platformPostId: string | null;
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
  longformCandidate: {
    eligible: boolean;
    reason: string;
    recommendation: string;
  };
  timeline: ThreadMetricTimelinePoint[];
  replies: Array<{
    id: string;
    username: string;
    text: string;
    timestamp: string;
  }>;
};

export type WordPressExpansionCandidate = {
  id: string;
  account: string;
  text: string;
  publishedAt: string;
  platformUrl: string | null;
  views: number;
  replies: number;
  engagementRate: number;
  conversationRate: number;
  amplificationRate: number;
  momentumLabel: string;
  longformScore: number;
  suggestedTitle: string;
  reason: string;
  recommendation: string;
  missionReason: string;
};

export type OperatingBrief = {
  lane: string;
  whyNow: string;
  assignment: string;
  successMetric: string;
  nextStep: string;
};

export type LearningSignalSummary = {
  label: string;
  observation: string;
  update: string;
};

export type PortfolioOperatingSnapshot = {
  automationPaused: boolean;
  autopilotMode: "review_only" | "auto_schedule" | "near_full_auto";
  wordpressPublishMode: "draft_only" | "auto_publish";
  activeAccounts: number;
  accountsNeedingCoverage: number;
  expiringAccounts: number;
  todayPublished: number;
  todayScheduled: number;
  directDrafts: number;
  pendingReview: number;
  optimizationDrafts: number;
  wordpressExpansion: number;
  totalExceptions: number;
  failedRuns24h: number;
  failedRuns14d: number;
  seoOpportunityCount: number;
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

function summarizePersonaPattern(posts: Array<{
  text: string;
  views: number;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
  shares: number;
}>) {
  if (!posts.length) {
    return {
      patternNote: "這個帳號目前還沒有足夠的已發布貼文可判讀。",
      recommendedMove: "先累積幾篇已發布內容，之後這裡會開始收出更像這個 persona 的節奏。"
    };
  }

  const averageLength = Math.round(posts.reduce((sum, post) => sum + post.text.trim().length, 0) / posts.length);
  const discussionHeavy = posts.filter((post) => {
    const views = post.views || 1;
    return (post.replies + post.quotes) / views >= 0.025;
  }).length;
  const shareHeavy = posts.filter((post) => {
    const views = post.views || 1;
    return (post.reposts + post.quotes + post.shares) / views >= 0.02;
  }).length;

  if (discussionHeavy > shareHeavy) {
    return {
      patternNote: "這個 persona 最近更容易吃到有立場、能引發回覆的觀點型內容。",
      recommendedMove: "優先寫可討論的切角，結尾留一個會讓人想回的問句。"
    };
  }

  if (shareHeavy > 0) {
    return {
      patternNote: "這個 persona 最近更容易吃到能被轉述與轉發的結論型內容。",
      recommendedMove: "把第一屏壓得更俐落，讓結論句更像一句可以被直接帶走的話。"
    };
  }

  return {
    patternNote: `這個 persona 目前較常落在 ${averageLength >= 180 ? "中長型分析" : "短句直給"} 的節奏。`,
    recommendedMove: "先維持這個節奏，再逐步測試更強的 hook 或 CTA，不要一次改太多。"
  };
}

function formatDate(value?: Date | null) {
  if (!value) {
    return "尚未同步";
  }

  return value.toLocaleString("zh-TW", { hour12: false });
}

function scoreDraftForReview(input: {
  title?: string | null;
  text?: string | null;
  topicTag?: string | null;
  createdAt: Date;
  personaLabel?: string | null;
  excerpt?: string | null;
  mission?: MissionContext | null;
}) {
  const title = input.title?.trim() ?? "";
  const text = (input.text ?? "").trim();
  let score = 58;

  if (input.topicTag === "opinion") score += 16;
  if (input.topicTag === "howto") score += 12;
  if (input.topicTag === "news") score += 8;
  if (title.startsWith("[觀點]")) score += 10;
  if (title.startsWith("[教學]")) score += 8;
  if (title.startsWith("[快訊]")) score += 4;
  if (/\d/.test(text)) score += 6;
  if (text.length >= 80 && text.length <= 230) score += 8;
  if (text.length > 260) score -= 6;
  if (input.personaLabel) score += 4;

  const ageHours = Math.max(0, (Date.now() - input.createdAt.getTime()) / (1000 * 60 * 60));
  score += Math.max(0, 12 - ageHours);

  const missionBoost = getMissionDraftBoost({
    mission: input.mission,
    title: input.title,
    text: input.text,
    topicTag: input.topicTag,
    excerpt: input.excerpt
  });

  return Math.round(clamp(score + missionBoost.scoreDelta, 0, 100));
}

function getTokenStatus(tokenExpiresAt: Date) {
  return tokenExpiresAt.getTime() <= Date.now() + 7 * 24 * 60 * 60 * 1000 ? "expiring" : "healthy";
}

function getCurrentTaipeiDayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function toTaipeiDayKey(value?: Date | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(value);
}

function extractCandidateRationale(notes?: string | null) {
  if (!notes) {
    return null;
  }

  const match = notes.match(/\|\s*Candidate:\s*(.+)$/);
  return match?.[1]?.trim() || null;
}

function normalizeTopicTag(topicTag?: string | null) {
  if (!topicTag) {
    return null;
  }

  const lastSegment = topicTag.split("|").at(-1)?.trim() || topicTag.trim();
  return ["news", "opinion", "howto"].includes(lastSegment) ? lastSegment : topicTag;
}

function getReviewLane(input: {
  platform: string;
  status: string;
  isAutoGenerated?: boolean;
  reviewScore?: number;
  candidateRationale?: string | null;
}) {
  if (
    input.platform === "threads" &&
    input.status === "draft" &&
    input.isAutoGenerated &&
    (input.reviewScore ?? 0) >= 82 &&
    input.candidateRationale
  ) {
    return "direct" as const;
  }

  return "review" as const;
}

function getSuggestedCta(input: {
  ctaStyle?: string | null;
  topicTag?: string | null;
  personaLabel?: string | null;
}) {
  const explicit = input.ctaStyle?.trim();
  if (explicit) {
    return explicit.length > 36 ? `${explicit.slice(0, 35)}…` : explicit;
  }

  if (input.topicTag === "news") {
    return "留一個你最在意的市場訊號";
  }

  if (input.topicTag === "howto") {
    return "回我你最想先試哪一步";
  }

  if (input.personaLabel?.includes("理財")) {
    return "留言你的痛點，我下一篇拆給你";
  }

  return "留一句你的看法，我接著寫下一篇";
}

function getTopicFlowReason(topicTag?: string | null) {
  if (topicTag === "news") {
    return "這篇比較像快訊 / 市場結論，系統先走 Threads 驗證觸達。";
  }

  if (topicTag === "howto") {
    return "這篇偏教學或流程題，先用 Threads 測需求，再決定要不要沉成長文。";
  }

  if (topicTag === "opinion") {
    return "這篇偏觀點與立場表達，先用 Threads 測互動與討論會比較有效。";
  }

  return "這篇先進 Threads 做題目驗證，後面再依表現決定是否擴寫。";
}

export function buildOperatingBrief(input: {
  title?: string | null;
  text?: string | null;
  topicTag?: string | null;
  candidateRationale?: string | null;
  personaLabel?: string | null;
  mission?: MissionContext | null;
}) {
  const strategy = summarizeMissionStrategy(input.mission);
  const titleOrText = (input.title?.trim() || input.text?.trim() || "這篇題目").slice(0, 80);
  const rationale = input.candidateRationale?.trim();
  const lane =
    input.topicTag === "news"
      ? "快節奏快評"
      : input.topicTag === "howto"
        ? "長期沉澱"
        : "深度拆解";
  const whyNow = rationale
    ? `系統先挑這篇，是因為 ${rationale}。`
    : `系統先挑這篇，是因為它和目前 mission 更接近：${strategy.primaryFocus}`;
  const assignment =
    input.topicTag === "news"
      ? `${titleOrText} 先走 Threads 驗證，重點是把結論壓到首屏，讓讀者快速知道現在該看什麼。`
      : input.topicTag === "howto"
        ? `${titleOrText} 先當可收藏題，Threads 負責驗需求，後面保留沉成 WordPress 長文的空間。`
        : `${titleOrText} 先走觀點 Threads，測試討論感與留言意願，再決定要不要延伸系列。`;
  const successMetric =
    input.topicTag === "news"
      ? "先看停留感、轉發與是否能順利被排程送出。"
      : input.topicTag === "howto"
        ? "先看收藏 / 搜尋承接潛力，再決定是否轉成長文。"
        : "先看留言、引用與 follow-up 潛力。";
  const nextStep =
    input.topicTag === "howto"
      ? `如果 Threads 有訊號，下一步直接進 WordPress lane；${strategy.wordpressBias}`
      : input.topicTag === "news"
        ? `如果 Threads 反應不錯，下一步補 follow-up 或沉成長文；${strategy.optimizationBias}`
        : `如果這篇討論起來，下一步做 follow-up 或長文拆解；${strategy.threadBias}`;

  return {
    lane,
    whyNow,
    assignment,
    successMetric,
    nextStep
  } satisfies OperatingBrief;
}

export function buildLearningSignals(input: {
  bestPost?: {
    text?: string | null;
    views: number;
    replies: number;
    reposts: number;
    shares: number;
  } | null;
  directDraftCount?: number;
  optimizationCount?: number;
  gscTopQuery?: {
    query: string;
    clicks: number;
    impressions: number;
  } | null;
  accountsMissingCoverage?: string[];
}) {
  const items: LearningSignalSummary[] = [];

  if (input.bestPost) {
    const amplification = input.bestPost.reposts + input.bestPost.shares;
    items.push({
      label: "內容學習",
      observation:
        input.bestPost.replies >= amplification
          ? "最近更吃討論型內容，留言訊號高於純擴散。"
          : "最近更吃可轉述的結論型內容，擴散訊號高於對話。",
      update:
        input.bestPost.replies >= amplification
          ? "下一輪 Threads 優先保留立場與問句，讓 AI 不要寫得太中性。"
          : "下一輪 Threads 優先壓縮首屏，把結論寫得更可被直接帶走。"
    });
  }

  if (typeof input.directDraftCount === "number" && typeof input.optimizationCount === "number") {
    items.push({
      label: "飛輪節奏",
      observation:
        input.optimizationCount > input.directDraftCount
          ? "優化飛輪正在變重要，系統最近更多是在補舊內容。"
          : "新題與新稿仍是主力，系統目前更像在擴張前線。",
      update:
        input.optimizationCount > input.directDraftCount
          ? "下一輪優先看 14 天後的標題、hook、CTA 回補。"
          : "下一輪優先讓高信心新稿更快進排程與發布。"
    });
  }

  if (input.gscTopQuery) {
    items.push({
      label: "搜尋學習",
      observation: `自然搜尋已經開始集中在「${input.gscTopQuery.query}」這類需求上。`,
      update:
        input.gscTopQuery.impressions > input.gscTopQuery.clicks * 10
          ? "下一輪應優先補 WordPress 承接頁與 title / desc 優化，而不是只加 Threads。"
          : "下一輪可直接把這個查詢延伸成更完整的長文群組與 CTA 承接。"
    });
  }

  if (input.accountsMissingCoverage?.length) {
    items.push({
      label: "營運節奏",
      observation: `${input.accountsMissingCoverage.join("、")} 這幾條線最近比較容易掉出每日最低一篇。`,
      update: "下一輪 portfolio scheduler 應優先把高可寫來源往這幾條線補，避免流量斷層。"
    });
  }

  return items.slice(0, 4);
}

function buildDraftDecisionReason(input: {
  reviewLane: "direct" | "review";
  reviewScore?: number;
  candidateRationale?: string | null;
  mission?: MissionContext | null;
  title?: string | null;
  text?: string | null;
  topicTag?: string | null;
  excerpt?: string | null;
}) {
  const missionBoost = getMissionDraftBoost({
    mission: input.mission,
    title: input.title,
    text: input.text,
    topicTag: input.topicTag,
    excerpt: input.excerpt
  });
  const overlapText = missionBoost.overlap.length ? ` mission 關鍵詞命中 ${missionBoost.overlap.slice(0, 3).join(" / ")}` : "";

  if (input.reviewLane === "direct") {
    return `這篇屬於高信心稿，分數 ${input.reviewScore ?? 0}，而且有明確來源理由；再加上${overlapText || " mission 方向也支持先衝短內容"}，所以先升到可直接最後確認。`;
  }

  if (!input.candidateRationale) {
    return `這篇先進待拍板，因為目前缺少清楚來源理由；你先補 assignment，再決定要不要發。${overlapText ? `另外，${overlapText.trim()}。` : ""}`;
  }

  return `這篇先進待拍板，因為雖然來源理由成立，但分數 ${input.reviewScore ?? 0} 還沒高到可直接送出；你先看 assignment 與收法。${overlapText ? `另外，${overlapText.trim()}。` : ""}`;
}

function buildLongformMissionReason(input: {
  mission?: MissionContext | null;
  text: string;
  views: number;
  replies: number;
}) {
  const boost = getMissionLongformBoost(input);
  if (boost.overlap.length) {
    return `這篇和 mission 的長文方向更接近：${boost.overlap.slice(0, 3).join(" / ")}，所以系統更願意把它沉成 WordPress。`;
  }

  if (boost.eligibleBias >= 2) {
    return "雖然這篇不一定是最高互動，但 mission 現在偏搜尋 / 長文沉澱，所以系統放寬了送進 WordPress 的門檻。";
  }

  return summarizeMissionStrategy(input.mission).wordpressBias;
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

export async function getAccountOperatingSummaries(): Promise<AccountOperatingSummary[]> {
  try {
    const currentDayKey = getCurrentTaipeiDayKey();
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const [settings, accounts, recentFailedLogs, wordpressExpansionCandidates] = await Promise.all([
      prisma.appSettings.findFirst(),
      prisma.platformAccount.findMany({
        where: {
          platform: "threads",
          isActive: true
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
          createdAt: "asc"
        }
      }),
      prisma.automationLog.findMany({
        where: {
          status: "failed",
          executedAt: {
            gte: fourteenDaysAgo
          },
          accountId: {
            not: null
          }
        },
        select: {
          accountId: true
        }
      }),
      getWordPressExpansionCandidates()
    ]);

    const accountIds = accounts.map((account) => account.id);
    const threadPlatformPostIds = (
      accountIds.length
        ? await prisma.post.findMany({
            where: {
              accountId: {
                in: accountIds
              },
              platformPostId: {
                not: null
              }
            },
            select: {
              accountId: true,
              platformPostId: true
            }
          })
        : []
    ).filter((post) => Boolean(post.platformPostId));

    const lightweightPosts = accountIds.length
      ? await prisma.post.findMany({
          where: {
            accountId: {
              in: accountIds
            },
            OR: [
              { status: "draft" },
              { status: "awaiting_approval" },
              { status: "approval_rejected" },
              { status: "scheduled" },
              {
                status: "published",
                publishedAt: {
                  gte: fourteenDaysAgo
                }
              },
              {
                topicTag: {
                  startsWith: "optimize:"
                }
              }
            ]
          },
          select: {
            accountId: true,
            status: true,
            isAutoGenerated: true,
            requiresApproval: true,
            topicTag: true,
            publishedAt: true,
            scheduledAt: true,
            createdAt: true
          }
        })
      : [];

    const threadPostsByPlatformId = new Map<string, string>();
    for (const post of threadPlatformPostIds) {
      if (post.platformPostId) {
        threadPostsByPlatformId.set(post.platformPostId, post.accountId);
      }
    }

    const postsByAccount = new Map<string, typeof lightweightPosts>();
    for (const post of lightweightPosts) {
      const current = postsByAccount.get(post.accountId) ?? [];
      current.push(post);
      postsByAccount.set(post.accountId, current);
    }

    for (const posts of postsByAccount.values()) {
      posts.sort((left, right) => {
        const leftTime = (left.publishedAt ?? left.scheduledAt ?? left.createdAt).getTime();
        const rightTime = (right.publishedAt ?? right.scheduledAt ?? right.createdAt).getTime();
        return rightTime - leftTime;
      });
    }

    const latestPublishedAtByAccount = new Map<string, Date>();
    for (const post of lightweightPosts) {
      if (post.status !== "published" || !post.publishedAt) {
        continue;
      }

      const current = latestPublishedAtByAccount.get(post.accountId);
      if (!current || current.getTime() < post.publishedAt.getTime()) {
        latestPublishedAtByAccount.set(post.accountId, post.publishedAt);
      }
    }

    const linkedPlatformPostIds = [...threadPostsByPlatformId.keys()];
    const wordpressLinkedDrafts = linkedPlatformPostIds.length
      ? await prisma.post.findMany({
          where: {
            account: {
              platform: "wordpress"
            },
            replyToPostId: {
              in: linkedPlatformPostIds
            }
          },
          select: {
            replyToPostId: true
          }
        })
      : [];

    const wordpressDraftCountByAccount = new Map<string, number>();
    for (const draft of wordpressLinkedDrafts) {
      if (!draft.replyToPostId) {
        continue;
      }
      const accountId = threadPostsByPlatformId.get(draft.replyToPostId);
      if (!accountId) {
        continue;
      }
      wordpressDraftCountByAccount.set(accountId, (wordpressDraftCountByAccount.get(accountId) ?? 0) + 1);
    }

    const failedCountByAccount = new Map<string, number>();
    for (const log of recentFailedLogs) {
      if (!log.accountId) {
        continue;
      }
      failedCountByAccount.set(log.accountId, (failedCountByAccount.get(log.accountId) ?? 0) + 1);
    }

    const expansionCountByUsername = new Map<string, number>();
    for (const candidate of wordpressExpansionCandidates) {
      expansionCountByUsername.set(candidate.account, (expansionCountByUsername.get(candidate.account) ?? 0) + 1);
    }

    const missionSummary = summarizeMissionStrategy({
      title: settings?.missionTitle,
      goal: settings?.editorialGoal,
      direction: settings?.editorialDirection,
      unit: settings?.missionUnit,
      currentValue: settings?.missionCurrentValue,
      targetValue: settings?.missionTargetValue
    });

    return accounts.map((account) => {
      const siteAutopilotMode =
        settings?.autopilotMode === "review_only" || settings?.autopilotMode === "auto_schedule"
          ? settings.autopilotMode
          : "near_full_auto";
      const effectiveAutopilotEnabled = isAutopilotEnabledForAccount(account, siteAutopilotMode);
      const effectiveAutopilotMode = getEffectiveAutopilotMode(account);
      const latestMetrics = account.metricsSnapshots[0];
      const accountPosts = postsByAccount.get(account.id) ?? [];
      const todayPublishedCount = accountPosts.filter(
        (post) => post.status === "published" && toTaipeiDayKey(post.publishedAt ?? post.createdAt) === currentDayKey
      ).length;
      const todayScheduledCount = accountPosts.filter(
        (post) => post.status === "scheduled" && toTaipeiDayKey(post.scheduledAt ?? post.createdAt) === currentDayKey
      ).length;
      const directDraftCount = accountPosts.filter(
        (post) => post.status === "draft" && post.isAutoGenerated && !post.requiresApproval
      ).length;
      const reviewDraftCount = accountPosts.filter((post) =>
        ["draft", "awaiting_approval", "approval_rejected"].includes(post.status) &&
        (!post.isAutoGenerated || post.requiresApproval)
      ).length;
      const optimizationDraftCount = accountPosts.filter((post) => post.topicTag?.startsWith("optimize:")).length;
      const latestPublishedAt = latestPublishedAtByAccount.get(account.id);
      const needsDailyPost =
        effectiveAutopilotEnabled && todayPublishedCount + todayScheduledCount === 0 && settings?.autopilotMode !== "review_only";
      const exceptionCount =
        (failedCountByAccount.get(account.id) ?? 0) +
        (getTokenStatus(account.tokenExpiresAt) === "expiring" ? 1 : 0) +
        reviewDraftCount;

      return {
        id: account.id,
        username: `@${account.platformUsername}`,
        platform: account.platform[0]?.toUpperCase() + account.platform.slice(1),
        personaLabel: account.personaLabel ?? undefined,
        defaultTone: account.defaultTone ?? undefined,
        tokenStatus: getTokenStatus(account.tokenExpiresAt),
        lastSyncedAt: formatDate(account.lastSyncedAt),
        followers: latestMetrics?.followerCount ?? 0,
        weeklyViews: latestMetrics?.totalViews ?? 0,
        autopilotEnabled: effectiveAutopilotEnabled,
        autoGenerateMode: effectiveAutopilotMode,
        accountMission:
          account.autoGenerateGoal?.trim() ||
          account.topicFocus?.trim() ||
          settings?.editorialGoal?.trim() ||
          missionSummary.primaryFocus,
        sourcePreference:
          account.topicFocus?.trim() ||
          account.autoGeneratePrompt?.trim() ||
          "目前優先吃站台 mission 與高可寫來源。",
        laneHint:
          account.topicFocus?.trim()
            ? `這個帳號目前偏 ${account.topicFocus.trim().slice(0, 42)}`
            : missionSummary.threadBias,
        todayPublishedCount,
        todayScheduledCount,
        directDraftCount,
        reviewDraftCount,
        optimizationDraftCount,
        wordpressDraftCount: wordpressDraftCountByAccount.get(account.id) ?? 0,
        wordpressExpansionCount: expansionCountByUsername.get(`@${account.platformUsername}`) ?? 0,
        exceptionCount,
        needsDailyPost,
        latestPublishedAt: latestPublishedAt ? formatDate(latestPublishedAt) : undefined
      };
    });
  } catch {
    return [];
  }
}

export async function getPortfolioOperatingSnapshot(): Promise<PortfolioOperatingSnapshot> {
  try {
    const [settings, accountSummaries, failedRuns24h, failedRuns14d, gscOpportunities] = await Promise.all([
      prisma.appSettings.findFirst(),
      getAccountOperatingSummaries(),
      prisma.automationLog.count({
        where: {
          status: "failed",
          executedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      }),
      prisma.automationLog.count({
        where: {
          status: "failed",
          executedAt: {
            gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      getGscOpportunityQueue().catch(() => ({
        configured: false,
        items: [],
        message: "目前還讀不到 Search Console 機會隊列。"
      }))
    ]);

    return {
      automationPaused: settings?.automationPaused ?? false,
      autopilotMode:
        settings?.autopilotMode === "review_only" || settings?.autopilotMode === "auto_schedule"
          ? settings.autopilotMode
          : "near_full_auto",
      wordpressPublishMode: settings?.wordpressPublishMode === "auto_publish" ? "auto_publish" : "draft_only",
      activeAccounts: accountSummaries.length,
      accountsNeedingCoverage: accountSummaries.filter((account) => account.needsDailyPost).length,
      expiringAccounts: accountSummaries.filter((account) => account.tokenStatus === "expiring").length,
      todayPublished: accountSummaries.reduce((sum, account) => sum + account.todayPublishedCount, 0),
      todayScheduled: accountSummaries.reduce((sum, account) => sum + account.todayScheduledCount, 0),
      directDrafts: accountSummaries.reduce((sum, account) => sum + account.directDraftCount, 0),
      pendingReview: accountSummaries.reduce((sum, account) => sum + account.reviewDraftCount, 0),
      optimizationDrafts: accountSummaries.reduce((sum, account) => sum + account.optimizationDraftCount, 0),
      wordpressExpansion: accountSummaries.reduce((sum, account) => sum + account.wordpressExpansionCount, 0),
      totalExceptions: accountSummaries.reduce((sum, account) => sum + account.exceptionCount, 0),
      failedRuns24h,
      failedRuns14d,
      seoOpportunityCount: gscOpportunities.items.length
    };
  } catch {
    return {
      automationPaused: false,
      autopilotMode: "near_full_auto",
      wordpressPublishMode: "draft_only",
      activeAccounts: 0,
      accountsNeedingCoverage: 0,
      expiringAccounts: 0,
      todayPublished: 0,
      todayScheduled: 0,
      directDrafts: 0,
      pendingReview: 0,
      optimizationDrafts: 0,
      wordpressExpansion: 0,
      totalExceptions: 0,
      failedRuns24h: 0,
      failedRuns14d: 0,
      seoOpportunityCount: 0
    };
  }
}

export async function getWorkspaceTopbarSnapshot(): Promise<WorkspaceTopbarSnapshot> {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [settings, activeAccount, activeAccounts, pendingReview, todayPublished, expiringAccounts, failedRuns24h] = await Promise.all([
      prisma.appSettings.findFirst(),
      prisma.platformAccount.findFirst({
        where: {
          isActive: true,
          platform: "threads"
        },
        orderBy: [{ lastSyncedAt: "desc" }, { createdAt: "desc" }]
      }),
      prisma.platformAccount.count({
        where: {
          isActive: true,
          platform: "threads"
        }
      }),
      prisma.post.count({
        where: {
          account: {
            platform: "threads"
          },
          OR: [
            { status: "awaiting_approval" },
            { approvalState: "pending" },
            { requiresApproval: true, status: "draft" }
          ]
        }
      }),
      prisma.post.count({
        where: {
          account: {
            platform: "threads"
          },
          status: "published",
          publishedAt: {
            gte: todayStart
          }
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
      prisma.automationLog.count({
        where: {
          status: "failed",
          executedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    const exceptionTotal = pendingReview + expiringAccounts + failedRuns24h;
    const exceptionLabel =
      exceptionTotal > 0
        ? `${exceptionTotal} 個例外待處理`
        : settings?.automationPaused
          ? "自動化目前暫停"
          : "目前沒有明顯例外";

    return {
      activeAccount: activeAccount
        ? {
            username: `@${activeAccount.platformUsername}`,
            platform: activeAccount.platform[0]?.toUpperCase() + activeAccount.platform.slice(1),
            lastSyncedAt: formatDate(activeAccount.lastSyncedAt)
          }
        : null,
      exceptionLabel,
      todayPublished,
      pendingReview,
      activeAccounts,
      automationPaused: settings?.automationPaused ?? false
    };
  } catch {
    return {
      activeAccount: null,
      exceptionLabel: "狀態暫時無法讀取",
      todayPublished: 0,
      pendingReview: 0,
      activeAccounts: 0,
      automationPaused: false
    };
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
        account: `@${post.account.platformUsername}`,
        personaLabel: post.account.personaLabel ?? undefined
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
            label: `@${account.platformUsername}${account.personaLabel ? ` · ${account.personaLabel}` : ""}${activeAccount?.id === account.id ? " · active" : ""}`,
            personaLabel: account.personaLabel ?? undefined
          }))
        ]
      },
      personaSnapshot:
        scopedAccountId !== "all"
          ? (() => {
              const scoped = accounts.find((entry) => entry.id === scopedAccountId);
              const pattern = summarizePersonaPattern(
                posts.map((post) => ({
                  text: post.textContent ?? post.title ?? "",
                  views: post.metrics[0]?.views ?? 0,
                  likes: post.metrics[0]?.likes ?? 0,
                  replies: post.metrics[0]?.replies ?? 0,
                  reposts: post.metrics[0]?.reposts ?? 0,
                  quotes: post.metrics[0]?.quotes ?? 0,
                  shares: post.metrics[0]?.shares ?? 0
                }))
              );

              return {
                label: scoped?.personaLabel || `@${scoped?.platformUsername ?? "threads"}`,
                tone: scoped?.defaultTone || "未設定",
                patternNote: pattern.patternNote,
                recommendedMove: pattern.recommendedMove
              };
            })()
          : null,
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
          personaLabel: post.account.personaLabel ?? undefined,
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
      personaSnapshot: null,
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
    const { env } = await import("@/lib/env");
    const [threadsAccount, scheduledCount] = await Promise.all([
      prisma.platformAccount.findFirst({
        where: { isActive: true, platform: "threads" },
        orderBy: [{ lastSyncedAt: "desc" }, { createdAt: "desc" }]
      }),
      prisma.post.count({
        where: {
          status: {
            in: ["scheduled", "awaiting_approval"]
          },
          account: {
            platform: "threads"
          }
        }
      })
    ]);
    const aiProviders = [
      env.openaiApiKey() ? "OpenAI" : null,
      env.geminiApiKey() ? "Gemini" : null,
      env.anthropicApiKey() ? "Claude" : null
    ].filter(Boolean) as string[];
    const aiReady = aiProviders.length > 0;
    const aiMessage = aiReady
      ? `已設定 ${aiProviders.join(" / ")}${env.geminiApiKey() ? ` · ${env.geminiModel()}` : env.openaiApiKey() ? ` · ${env.openaiModel()}` : ""}`
      : "尚未設定任何 AI provider";

    if (!threadsAccount) {
      return {
        threadsReady: false,
        threadsMessage: "尚未連接可用的 Threads 帳號",
        tokenStatus: "missing",
        tokenMessage: "沒有 Threads token 可用",
        queueCount: scheduledCount,
        queueMessage: scheduledCount > 0 ? `目前有 ${scheduledCount} 筆 Threads 排程 / 待確認貼文` : "目前沒有待送出的 Threads 排程",
        aiReady,
        aiMessage
      };
    }

    const expiringSoon = threadsAccount.tokenExpiresAt.getTime() <= Date.now() + 7 * 24 * 60 * 60 * 1000;

    return {
      threadsReady: true,
      threadsMessage: `目前可用帳號：@${threadsAccount.platformUsername}`,
      tokenStatus: expiringSoon ? "expiring" : "healthy",
      tokenMessage: expiringSoon ? "Threads token 7 天內將到期，建議儘快重新授權" : "Threads token 狀態正常",
      queueCount: scheduledCount,
      queueMessage: scheduledCount > 0 ? `目前有 ${scheduledCount} 筆 Threads 排程 / 待確認貼文` : "目前沒有待送出的 Threads 排程",
      aiReady,
      aiMessage
    };
  } catch {
    return {
      threadsReady: false,
      threadsMessage: "目前無法讀取發佈狀態",
      tokenStatus: "missing",
      tokenMessage: "尚未讀到 token 狀態",
      queueCount: 0,
      queueMessage: "尚未讀到排程資料",
      aiReady: false,
      aiMessage: "尚未讀到 AI 設定"
    };
  }
}

export async function getPublishOutcomeLogs(): Promise<PublishOutcomeSummary[]> {
  try {
    const logs = await prisma.automationLog.findMany({
      where: {
        actionType: {
          in: [
            "threads_publish",
            "threads_schedule",
            "threads_publish_failed",
            "threads_scheduled_publish",
            "threads_scheduled_failed",
            "wordpress_draft_sync",
            "wordpress_draft_sync_failed"
          ]
        }
      },
      include: {
        account: true
      },
      orderBy: {
        executedAt: "desc"
      },
      take: 8
    });

    return logs.map((log) => ({
      id: log.id,
      actionType: log.actionType,
      status: log.status,
      detail: log.detail ?? "已記錄發佈結果",
      executedAt: formatDate(log.executedAt),
      accountLabel: log.account ? `@${log.account.platformUsername}` : "未知帳號",
      postHref: log.postId ? (log.account?.platform === "wordpress" ? `/compose?postId=${log.postId}` : `/posts/${log.postId}`) : "/compose"
    }));
  } catch {
    return [];
  }
}

export async function getPostSummaries(): Promise<PostSummary[]> {
  try {
    const dayFormatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Taipei",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    const todayKey = dayFormatter.format(new Date());
    const [posts, ingestions, settings] = await Promise.all([
      prisma.post.findMany({
        include: {
          account: true
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 20
      }),
      prisma.ingestionRecord.findMany({
        where: {
          generatedPostIds: {
            not: null
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 80,
        select: {
          generatedPostIds: true,
          notes: true
        }
      }),
      prisma.appSettings.findFirst()
    ]);
    const missionContext = {
      title: settings?.missionTitle,
      goal: settings?.editorialGoal,
      direction: settings?.editorialDirection,
      unit: settings?.missionUnit,
      currentValue: settings?.missionCurrentValue,
      targetValue: settings?.missionTargetValue
    };
    const rationaleByPostId = new Map<string, string>();

    for (const ingestion of ingestions) {
      const rationale = extractCandidateRationale(ingestion.notes);
      if (!rationale || !ingestion.generatedPostIds) {
        continue;
      }

      try {
        const ids = JSON.parse(ingestion.generatedPostIds) as string[];
        for (const id of ids) {
          if (!rationaleByPostId.has(id)) {
            rationaleByPostId.set(id, rationale);
          }
        }
      } catch {}
    }

    const threadAccountIds = Array.from(
      new Set(posts.filter((post) => post.account.platform === "threads").map((post) => post.accountId))
    );
    const accountPerformance = threadAccountIds.length
      ? await prisma.platformAccount.findMany({
          where: {
            id: {
              in: threadAccountIds
            }
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
      : [];
    const timingSuggestionByAccountId = new Map(
      accountPerformance.map((account) => [
        account.id,
        inferBestScheduleTime({
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
      ])
    );

    return posts.map((post) => {
      const normalizedTopicTag = normalizeTopicTag(post.topicTag);
      const candidateRationale = rationaleByPostId.get(post.id) ?? (post.isAutoGenerated ? post.excerpt ?? null : null);
      const reviewScore =
        post.account.platform === "threads" &&
        ["draft", "awaiting_approval", "approval_rejected"].includes(post.status)
          ? scoreDraftForReview({
            title: post.title,
            text: post.textContent ?? post.title,
            topicTag: normalizedTopicTag,
            createdAt: post.createdAt,
            personaLabel: post.account.personaLabel,
            excerpt: post.excerpt,
            mission: missionContext
          })
          : undefined;
      const reviewLane = getReviewLane({
        platform: post.account.platform,
        status: post.status,
        isAutoGenerated: post.isAutoGenerated,
        reviewScore,
        candidateRationale
      });
      const timingSuggestion =
        post.account.platform === "threads" && reviewLane === "direct"
          ? timingSuggestionByAccountId.get(post.accountId)
          : null;
      const suggestedCta =
        post.account.platform === "threads" && reviewLane === "direct"
          ? getSuggestedCta({
              ctaStyle: post.account.ctaStyle,
              topicTag: normalizedTopicTag,
              personaLabel: post.account.personaLabel
            })
          : null;
      const laneReason =
        post.account.platform === "threads"
          ? buildDraftDecisionReason({
              reviewLane,
              reviewScore,
              candidateRationale,
              mission: missionContext,
              title: post.title,
              text: post.textContent ?? post.title,
              topicTag: normalizedTopicTag,
              excerpt: post.excerpt
            })
          : null;
      const missionReason =
        post.account.platform === "threads"
          ? getTopicFlowReason(normalizedTopicTag)
          : "這篇屬於長文承接層，主要負責知識沉澱與 SEO / CTA 承接。";

      return {
      id: post.id,
      account: `@${post.account.platformUsername}`,
      accountId: post.accountId,
      platform: post.account.platform,
      personaLabel: post.account.personaLabel ?? undefined,
      topicTag: normalizedTopicTag,
      candidateRationale,
      isFreshToday: dayFormatter.format(post.createdAt) === todayKey,
      reviewScore,
      reviewLane,
      laneReason,
      missionReason,
      suggestedScheduleLabel: timingSuggestion?.label ?? null,
      suggestedCta,
      status: post.status,
      requiresApproval: post.requiresApproval,
      approvalState: post.approvalState,
      scheduledAt: formatDate(post.scheduledAt ?? post.createdAt),
      text: post.title ?? post.textContent ?? "(無文字內容)",
      title: post.title,
      platformUrl: post.platformUrl
    };
    });
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

    const replies =
      post.platformPostId
        ? await getPlatformAdapter("threads")
            .getPostReplies(post.accountId, post.platformPostId)
            .then((items) =>
              items.slice(0, 8).map((reply) => ({
                id: reply.id,
                username: reply.username,
                text: reply.text,
                timestamp: new Date(reply.timestamp).toLocaleString("zh-TW", { hour12: false })
              }))
            )
            .catch(() => [])
        : [];

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
    const longformSignals = {
      engagementRate: health.engagementRate,
      conversationRate: health.conversationRate,
      amplificationRate: health.amplificationRate,
      views: latestMetrics.views,
      replies: latestMetrics.replies
    };
    const longformEligible =
      longformSignals.engagementRate >= 0.06 ||
      longformSignals.conversationRate >= 0.018 ||
      longformSignals.amplificationRate >= 0.012 ||
      health.momentum === "spiking" ||
      longformSignals.replies >= 8;
    const longformReason = longformEligible
      ? `這篇貼文的互動率 ${(longformSignals.engagementRate * 100).toFixed(1)}%、對話率 ${(longformSignals.conversationRate * 100).toFixed(1)}%，已經足夠把短觀點擴成一篇有脈絡的長文。`
      : `這篇目前比較像短內容測試，雖然有 ${longformSignals.views} 次瀏覽，但對話率 ${(longformSignals.conversationRate * 100).toFixed(1)}% 還不高，建議先再觀察一輪。`;
    const longformRecommendation = longformEligible
      ? "先把這篇 Threads 的結論保留，再補背景、案例、反例和可操作建議，整理成一篇有觀點的 WordPress 草稿。"
      : "先把它當成市場測試樣本，觀察留言與二次擴散；如果後續開始有討論，再轉成長文會更準。";

    return {
      id: post.id,
      account: `@${post.account.platformUsername}`,
      text: post.textContent ?? post.title ?? "(無文字內容)",
      platformUrl: post.platformUrl,
      platformPostId: post.platformPostId,
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
      longformCandidate: {
        eligible: longformEligible,
        reason: longformReason,
        recommendation: longformRecommendation
      },
      timeline,
      replies
    };
  } catch {
    return null;
  }
}

export async function getWordPressExpansionCandidates(): Promise<WordPressExpansionCandidate[]> {
  try {
    const [posts, settings] = await Promise.all([
      prisma.post.findMany({
        where: {
          status: "published",
          account: {
            platform: "threads"
          },
          platformPostId: {
            not: null
          }
        },
        include: {
          account: true,
          metrics: {
            orderBy: {
              capturedAt: "asc"
            }
          }
        },
        orderBy: {
          publishedAt: "desc"
        },
        take: 12
      }),
      prisma.appSettings.findFirst()
    ]);
    const missionContext = {
      title: settings?.missionTitle,
      goal: settings?.editorialGoal,
      direction: settings?.editorialDirection,
      unit: settings?.missionUnit,
      currentValue: settings?.missionCurrentValue,
      targetValue: settings?.missionTargetValue
    };

    const platformPostIds = posts.map((post) => post.platformPostId).filter(Boolean) as string[];
    const existingDrafts = platformPostIds.length
      ? await prisma.post.findMany({
          where: {
            account: {
              platform: "wordpress"
            },
            replyToPostId: {
              in: platformPostIds
            }
          },
          select: {
            replyToPostId: true
          }
        })
      : [];
    const existingSet = new Set(existingDrafts.map((post) => post.replyToPostId).filter(Boolean));

    return posts
      .map((post) => {
        const latest = post.metrics.at(-1);
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
        const missionBoost = getMissionLongformBoost({
          mission: missionContext,
          text: `${post.title ?? ""} ${post.textContent ?? ""}`.trim(),
          views: latestMetrics.views,
          replies: latestMetrics.replies
        });
        const eligible =
          health.engagementRate >= 0.06 ||
          health.conversationRate >= 0.018 ||
          health.amplificationRate >= 0.012 ||
          health.momentum === "spiking" ||
          latestMetrics.replies >= 8 ||
          missionBoost.eligibleBias >= 2;

        return {
          id: post.id,
          account: `@${post.account.platformUsername}`,
          text: post.textContent ?? post.title ?? "(無文字內容)",
          publishedAt: formatDate(post.publishedAt ?? post.createdAt),
          platformUrl: post.platformUrl,
          platformPostId: post.platformPostId,
          views: latestMetrics.views,
          replies: latestMetrics.replies,
          engagementRate: health.engagementRate,
          conversationRate: health.conversationRate,
          amplificationRate: health.amplificationRate,
          momentumLabel: health.momentumLabel,
          longformScore: Math.round(
            ((health.engagementRate * 1000 + health.conversationRate * 1600 + health.amplificationRate * 1300 + missionBoost.scoreDelta * 10)) *
              (health.momentum === "spiking" ? 1.12 : 1)
          ),
          suggestedTitle: `從「${(post.title ?? post.textContent ?? "這則 Threads").replace(/^\[[^\]]+\]\s*/, "").slice(0, 28)}」延伸：把短觀點整理成可收藏的完整文章`,
          reason: eligible
            ? `互動率 ${(health.engagementRate * 100).toFixed(1)}%、對話率 ${(health.conversationRate * 100).toFixed(1)}%，再加上 mission 偏長文 / 搜尋沉澱，已經有足夠訊號支撐成長文。`
            : `這篇雖然有曝光，但目前更適合先當短內容觀察樣本。`,
          recommendation:
            health.momentum === "spiking"
              ? "趁熱把這篇的核心觀點補成背景、案例和反例，先起一版 WordPress 草稿。"
              : "把這篇的觀點拆成脈絡、數據與可操作建議，做成比較完整的長文版本。",
          missionReason: buildLongformMissionReason({
            mission: missionContext,
            text: `${post.title ?? ""} ${post.textContent ?? ""}`.trim(),
            views: latestMetrics.views,
            replies: latestMetrics.replies
          }),
          eligible
        };
      })
      .filter((post) => post.eligible && post.platformPostId && !existingSet.has(post.platformPostId))
      .sort((left, right) => {
        return right.longformScore - left.longformScore;
      })
      .slice(0, 5)
      .map((post) => ({
        id: post.id,
        account: post.account,
        text: post.text,
        publishedAt: post.publishedAt,
        platformUrl: post.platformUrl,
        views: post.views,
        replies: post.replies,
        engagementRate: post.engagementRate,
        conversationRate: post.conversationRate,
        amplificationRate: post.amplificationRate,
        momentumLabel: post.momentumLabel,
        longformScore: post.longformScore,
        suggestedTitle: post.suggestedTitle,
        reason: post.reason,
        recommendation: post.recommendation,
        missionReason: post.missionReason
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
