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
    id: "pm-ops",
    label: "PM Ops",
    hint: "唯一首頁：mission、待拍板與今日節奏",
    primaryHref: "/desk",
    items: [
      { href: "/desk", label: "PM Ops", hint: "mission、今日待拍板、兩條營運軌" },
      { href: "/analytics", label: "Analytics", hint: "14 天觀察、留言與表現回饋" },
      { href: "/inventory", label: "Content Inventory", hint: "source 到 monetizable" }
    ]
  },
  {
    id: "review",
    label: "Review",
    hint: "所有需要你拍板的內容先進這裡",
    primaryHref: "/review",
    items: [
      { href: "/review", label: "Review Board", hint: "Threads 待拍板與下一步" },
      { href: "/posts", label: "Queue", hint: "直接發 / 先看一下 / WordPress 擴寫" },
      { href: "/inbox", label: "Source Inbox", hint: "高訊號來源與建議方向" }
    ]
  },
  {
    id: "factory",
    label: "Content Factory",
    hint: "來源轉稿、AI 起稿、persona autopilot、長文擴寫",
    primaryHref: "/factory",
    items: [
      { href: "/factory", label: "Factory", hint: "AI 寫文工廠與知識輸入主線" },
      { href: "/content-engine", label: "Advanced Engine", hint: "進階素材拆稿台" },
      { href: "/wordpress", label: "WordPress Draft Studio", hint: "長文沉澱與 CTA/affiliate" }
    ]
  },
  {
    id: "config",
    label: "Config",
    hint: "帳號、persona、來源包、AI、WordPress、診斷",
    primaryHref: "/config",
    items: [
      { href: "/config", label: "Config Hub", hint: "站台級設定與知識輸入入口" },
      { href: "/accounts", label: "Accounts", hint: "Threads OAuth + persona + autopilot" },
      { href: "/sources", label: "Sources", hint: "starter packs + watchlist" },
      { href: "/ops", label: "Ops", hint: "env、schema 與 deploy checklist" }
    ]
  }
];

export const dashboardPrimaryLinks: DashboardNavItem[] = [
  { href: "/desk", label: "PM Ops", hint: "今天先看 mission、待拍板與節奏" },
  { href: "/review", label: "Review", hint: "所有需要你拍板的稿件" },
  { href: "/compose", label: "Compose", hint: "最後確認與送出 Threads" },
  { href: "/analytics", label: "Analytics", hint: "14 天觀察、留言與下一步" }
];
