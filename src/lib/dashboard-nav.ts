export type DashboardNavItem = {
  href: string;
  label: string;
  hint: string;
};

export type DashboardNavGroup = {
  id: string;
  label: string;
  hint: string;
  primaryHref: string;
  items: DashboardNavItem[];
};

export const dashboardNavGroups: DashboardNavGroup[] = [
  {
    id: "overview",
    label: "總覽",
    hint: "今天狀態、資產與分析",
    primaryHref: "/dashboard",
    items: [
      { href: "/dashboard", label: "總覽", hint: "Threads KPI + health" },
      { href: "/analytics", label: "分析", hint: "表現、留言、下一步" },
      { href: "/inventory", label: "內容庫存", hint: "source 到 monetizable" }
    ]
  },
  {
    id: "desk",
    label: "內容台",
    hint: "看來源、挑題、回到草稿",
    primaryHref: "/desk",
    items: [
      { href: "/desk", label: "Desk", hint: "今天先看這裡" },
      { href: "/inbox", label: "Inbox", hint: "高訊號來源與改寫建議" },
      { href: "/sources", label: "來源", hint: "watchlist + import" }
    ]
  },
  {
    id: "publish",
    label: "發佈",
    hint: "AI 起稿、發 Threads、沉長文",
    primaryHref: "/compose",
    items: [
      { href: "/compose", label: "Compose", hint: "起稿、修稿、發文、排程" },
      { href: "/posts", label: "Queue", hint: "review queue + next moves" },
      { href: "/wordpress", label: "WP 草稿", hint: "draft sync + expansion" }
    ]
  },
  {
    id: "system",
    label: "設定",
    hint: "帳號、人設、自動化、診斷",
    primaryHref: "/accounts",
    items: [
      { href: "/accounts", label: "帳號", hint: "Threads OAuth + persona" },
      { href: "/automation", label: "自動化", hint: "rules + safety" },
      { href: "/ops", label: "Ops", hint: "env + db diagnostics" },
      { href: "/help", label: "說明中心", hint: "workflow + AI guide" }
    ]
  }
];

export const dashboardPrimaryLinks: DashboardNavItem[] = [
  { href: "/desk", label: "Desk", hint: "今天先看這裡" },
  { href: "/compose", label: "發文", hint: "AI 起稿 + Threads 發佈" },
  { href: "/analytics", label: "分析", hint: "復盤 + rewrite radar" },
  { href: "/accounts", label: "帳號", hint: "persona + autopilot" }
];
