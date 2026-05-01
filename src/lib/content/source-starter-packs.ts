export type SourceStarterPreset = {
  label: string;
  sourceType: "rss" | "url";
  sourceUrl: string;
  preferredOutcome: "threads" | "wordpress";
  autoImportEnabled: boolean;
};

export type SourceStarterPack = {
  id: "taiwan-market" | "us-market" | "macro" | "etf-income";
  title: string;
  shortLabel: string;
  description: string;
  focus: string;
  ingestHint: string;
  bestFor: string;
  items: SourceStarterPreset[];
};

export const FINANCE_STARTER_PACKS: SourceStarterPack[] = [
  {
    id: "taiwan-market",
    title: "台股與台灣市場",
    shortLabel: "台股",
    description: "先看台股盤勢、焦點股和本地市場題目，適合每天產出 Threads 候選稿。",
    focus: "台灣市場 / 焦點股 / 盤中脈絡",
    ingestHint: "以 RSS 為主，適合快節奏短文與每日觀察。",
    bestFor: "想每天穩定產出一則台股 Threads 的 persona",
    items: [
      {
        label: "鉅亨網 即時頭條",
        sourceType: "rss",
        sourceUrl: "https://news.cnyes.com/rss/v1/news/category/headline",
        preferredOutcome: "threads",
        autoImportEnabled: true
      },
      {
        label: "經濟日報 市場焦點",
        sourceType: "rss",
        sourceUrl: "http://money.udn.com/rssfeed/news/1001/5597/5735?ch=money",
        preferredOutcome: "threads",
        autoImportEnabled: true
      }
    ]
  },
  {
    id: "us-market",
    title: "美股與全球股市",
    shortLabel: "美股",
    description: "偏美股、財報、風險資產與全球市場波動，適合做結論型與觀點型短文。",
    focus: "美股 / 財報 / 全球風險資產",
    ingestHint: "先抓 headline 與 market-moving news，再由 AI 收斂觀點。",
    bestFor: "偏美股觀點、快評與市場拆解的 persona",
    items: [
      {
        label: "Investing.com 股票市場新聞",
        sourceType: "rss",
        sourceUrl: "https://api.investing.com/api/financialdata/news/stock-market-news.rss",
        preferredOutcome: "threads",
        autoImportEnabled: true
      }
    ]
  },
  {
    id: "macro",
    title: "總經與利率觀察",
    shortLabel: "宏觀",
    description: "偏總經、數據、公債、通膨與利率，適合做解釋型或情境推演型內容。",
    focus: "利率 / 通膨 / 債券 / 宏觀數據",
    ingestHint: "適合先整理數據訊號，再轉成解釋型 Threads 或長文草稿。",
    bestFor: "擅長解釋市場脈絡、宏觀框架的 persona",
    items: [
      {
        label: "Investing.com 經濟指標",
        sourceType: "rss",
        sourceUrl: "https://api.investing.com/api/financialdata/news/economic-indicators.rss",
        preferredOutcome: "threads",
        autoImportEnabled: true
      },
      {
        label: "Investing.com 經濟新聞",
        sourceType: "rss",
        sourceUrl: "https://api.investing.com/api/financialdata/news/economy.rss",
        preferredOutcome: "threads",
        autoImportEnabled: true
      }
    ]
  },
  {
    id: "etf-income",
    title: "ETF 與配息題材",
    shortLabel: "ETF",
    description: "偏 ETF、基金與收益型題材，適合累積成理財觀點或後續長文延伸。",
    focus: "ETF / 收益 / 配息 / 基金觀察",
    ingestHint: "站點型來源較多，正文正規化後更適合沉成 WordPress 草稿。",
    bestFor: "想累積理財教學、資產配置與長文沉澱的 persona",
    items: [
      {
        label: "鉅亨網 ETF 類別頁",
        sourceType: "url",
        sourceUrl: "https://news.cnyes.com/news/cat/etf",
        preferredOutcome: "threads",
        autoImportEnabled: true
      },
      {
        label: "鉅亨網 基金評論",
        sourceType: "url",
        sourceUrl: "https://news.cnyes.com/news/cat/fund_comment",
        preferredOutcome: "wordpress",
        autoImportEnabled: true
      }
    ]
  }
];

export const FINANCE_STARTER_PACK = FINANCE_STARTER_PACKS.flatMap((pack) => pack.items);

export function getFinanceStarterPack(packId?: string) {
  if (!packId || packId === "all") {
    return FINANCE_STARTER_PACK;
  }

  return FINANCE_STARTER_PACKS.find((pack) => pack.id === packId)?.items ?? [];
}
