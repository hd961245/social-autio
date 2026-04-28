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
  items: SourceStarterPreset[];
};

export const FINANCE_STARTER_PACKS: SourceStarterPack[] = [
  {
    id: "taiwan-market",
    title: "台股與台灣市場",
    shortLabel: "台股",
    description: "先看台股盤勢、焦點股和本地市場題目，適合每天產出 Threads 候選稿。",
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
