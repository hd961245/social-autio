export type SourceStarterPreset = {
  label: string;
  sourceType: "rss" | "url";
  sourceUrl: string;
  preferredOutcome: "threads" | "wordpress";
  autoImportEnabled: boolean;
};

export const FINANCE_STARTER_PACK: SourceStarterPreset[] = [
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
  },
  {
    label: "Investing.com 股票市場新聞",
    sourceType: "rss",
    sourceUrl: "https://api.investing.com/api/financialdata/news/stock-market-news.rss",
    preferredOutcome: "threads",
    autoImportEnabled: true
  },
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
];
