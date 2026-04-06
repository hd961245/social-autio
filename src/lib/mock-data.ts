export type AccountCard = {
  id: string;
  username: string;
  platform: string;
  tokenStatus: "healthy" | "expiring";
  lastSyncedAt: string;
  followers: number;
  weeklyViews: number;
};

export type QueuePost = {
  id: string;
  account: string;
  status: "scheduled" | "publishing" | "published" | "failed";
  scheduledAt: string;
  text: string;
};

export type KeywordHit = {
  id: string;
  keyword: string;
  author: string;
  matchedAt: string;
  actionTaken: string;
  excerpt: string;
};

export const mockAccounts: AccountCard[] = [
  {
    id: "acc_1",
    username: "@demo_threads",
    platform: "Threads",
    tokenStatus: "healthy",
    lastSyncedAt: "2026-04-06 15:20",
    followers: 1840,
    weeklyViews: 23200
  },
  {
    id: "acc_2",
    username: "@brand_signal",
    platform: "Threads",
    tokenStatus: "expiring",
    lastSyncedAt: "2026-04-06 12:45",
    followers: 965,
    weeklyViews: 9100
  }
];

export const mockQueuePosts: QueuePost[] = [
  {
    id: "post_1",
    account: "@demo_threads",
    status: "scheduled",
    scheduledAt: "2026-04-06 18:30",
    text: "今晚測試第一輪 Threads 發文排程，觀察互動數據。"
  },
  {
    id: "post_2",
    account: "@brand_signal",
    status: "failed",
    scheduledAt: "2026-04-06 10:05",
    text: "測試貼文失敗，等待重試。"
  }
];

export const mockKeywordHits: KeywordHit[] = [
  {
    id: "hit_1",
    keyword: "social audio",
    author: "trend_watcher",
    matchedAt: "15 分鐘前",
    actionTaken: "replied",
    excerpt: "這個 social audio 類型最近很多人在討論。"
  },
  {
    id: "hit_2",
    keyword: "口碑操作",
    author: "market_map",
    matchedAt: "42 分鐘前",
    actionTaken: "none",
    excerpt: "有人有在研究口碑操作工具嗎？"
  }
];

export const mockDashboardStats = [
  { label: "活躍帳號", value: "2", detail: "1 個 token 即將到期" },
  { label: "今日已排程", value: "8", detail: "剩餘配額 242" },
  { label: "7 日曝光", value: "32.3K", detail: "較上週 +18%" },
  { label: "關鍵字命中", value: "14", detail: "4 筆待處理" }
];

export const mockTrend = [
  { day: "Mon", followers: 2410, engagement: 420 },
  { day: "Tue", followers: 2428, engagement: 505 },
  { day: "Wed", followers: 2440, engagement: 552 },
  { day: "Thu", followers: 2452, engagement: 498 },
  { day: "Fri", followers: 2479, engagement: 610 },
  { day: "Sat", followers: 2492, engagement: 688 },
  { day: "Sun", followers: 2516, engagement: 720 }
];

