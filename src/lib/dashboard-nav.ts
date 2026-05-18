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
    hint: "全帳號總控盤：mission、每日進度與例外",
    primaryHref: "/desk",
    items: [
      { href: "/desk", label: "Portfolio View", hint: "總 mission、各帳號今日進度與例外" },
      { href: "/content-os", label: "Content OS", hint: "四層知識庫、題目池、draft 與 learning loop" },
      { href: "/inventory", label: "Content Inventory", hint: "source 到 monetizable 的內容總庫" }
    ]
  },
  {
    id: "accounts",
    label: "Accounts",
    hint: "每個帳號都是一條獨立營運線",
    primaryHref: "/accounts",
    items: [
      { href: "/accounts", label: "Account Portfolio", hint: "每帳號 mission、發布、來源、優化與例外" },
      { href: "/sources", label: "Source Supply", hint: "來源池、starter packs 與供應鏈策略" },
      { href: "/wordpress", label: "WordPress Lane", hint: "長文沉澱、SEO 草稿與增長曲線" }
    ]
  },
  {
    id: "review",
    label: "Review",
    hint: "所有需要你拍板的內容先進這裡",
    primaryHref: "/review",
    items: [
      { href: "/review", label: "Review Board", hint: "真正需要人工介入的例外與高價值決策" },
      { href: "/posts", label: "Queue", hint: "最後確認、直接發與待拍板分流" },
      { href: "/compose", label: "Compose", hint: "只做最後確認與送出" }
    ]
  },
  {
    id: "factory",
    label: "Factory",
    hint: "系統已處理、正在處理、失敗待修復",
    primaryHref: "/factory",
    items: [
      { href: "/factory", label: "Factory Feed", hint: "背景工廠、自動處理與失敗修復" },
      { href: "/content-engine", label: "Content Factory", hint: "AI 起稿、來源轉稿與知識輸入" },
      { href: "/inbox", label: "Source Inbox", hint: "高訊號來源與建議方向" }
    ]
  },
  {
    id: "analytics",
    label: "Analytics",
    hint: "只看營運決策需要的數字、排行、機會與例外",
    primaryHref: "/analytics",
    items: [
      { href: "/analytics", label: "Traffic Layer", hint: "GA4、GSC、Threads 與增長機會" },
      { href: "/inventory", label: "Content Outcomes", hint: "內容資產、SEO 與長文承接結果" }
    ]
  },
  {
    id: "config",
    label: "Config",
    hint: "所有不屬於日常營運的設定與診斷",
    primaryHref: "/config",
    items: [
      { href: "/config", label: "Config Hub", hint: "站台級設定、知識輸入與擴張接口" },
      { href: "/automation", label: "Automation", hint: "日報、背景任務與保險機制" },
      { href: "/ops", label: "Ops", hint: "env、schema 與 deploy checklist" }
    ]
  }
];

export const dashboardPrimaryLinks: DashboardNavItem[] = [
  { href: "/desk", label: "PM Ops", hint: "全帳號總控盤與每日進度" },
  { href: "/accounts", label: "Accounts", hint: "每帳號獨立營運線" },
  { href: "/review", label: "Review", hint: "例外、待拍板與高價值決策" },
  { href: "/factory", label: "Factory", hint: "系統已處理、正在處理、失敗待修復" },
  { href: "/analytics", label: "Analytics", hint: "流量、排行、機會與例外" },
  { href: "/config", label: "Config", hint: "設定、保險絲與診斷" }
];
