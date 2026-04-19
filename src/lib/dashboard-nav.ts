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
    hint: "健康、數據、目前狀態",
    primaryHref: "/dashboard",
    items: [
      { href: "/dashboard", label: "總覽", hint: "Threads KPI + health" },
      { href: "/inventory", label: "Inventory", hint: "content stages + wp memory" },
      { href: "/analytics", label: "分析", hint: "insights + quota" },
      { href: "/posts", label: "Queue", hint: "threads queue + wp drafts" }
    ]
  },
  {
    id: "desk",
    label: "Desk",
    hint: "看來源、改寫、回到隊列",
    primaryHref: "/desk",
    items: [
      { href: "/desk", label: "Content Desk", hint: "inbox + sources + engine + queue" },
      { href: "/inbox", label: "Inbox", hint: "ready to process" },
      { href: "/sources", label: "來源", hint: "watchlist + import" },
      { href: "/posts", label: "Queue", hint: "draft review + next moves" }
    ]
  },
  {
    id: "publish",
    label: "發佈",
    hint: "寫、排、沉到草稿",
    primaryHref: "/compose",
    items: [
      { href: "/compose", label: "發文", hint: "publish + draft" },
      { href: "/content-engine", label: "內容引擎", hint: "rewrite + split" },
      { href: "/wordpress", label: "WP 草稿", hint: "connect + draft sync" }
    ]
  },
  {
    id: "system",
    label: "系統",
    hint: "帳號、規則、診斷",
    primaryHref: "/accounts",
    items: [
      { href: "/accounts", label: "帳號", hint: "Threads OAuth + status" },
      { href: "/keywords", label: "關鍵字", hint: "monitor + hits" },
      { href: "/automation", label: "自動化", hint: "rules + safety" },
      { href: "/ops", label: "Ops", hint: "env + db diagnostics" },
      { href: "/help", label: "說明中心", hint: "workflow + AI guide" }
    ]
  }
];

export const dashboardPrimaryLinks: DashboardNavItem[] = [
  { href: "/dashboard", label: "總覽", hint: "Threads KPI + health" },
  { href: "/desk", label: "Desk", hint: "content workflow hub" },
  { href: "/inventory", label: "Inventory", hint: "stage view + draft memory" },
  { href: "/compose", label: "發文", hint: "publish + draft" },
  { href: "/analytics", label: "分析", hint: "insights + quota" }
];
