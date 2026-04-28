export type SourceStarterPreset = {
  label: string;
  sourceType: "rss" | "url";
  sourceUrl: string;
  preferredOutcome: "threads" | "wordpress";
  autoImportEnabled: boolean;
};

export const FINANCE_STARTER_PACK: SourceStarterPreset[] = [
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
