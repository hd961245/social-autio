export type SourceStarterPreset = {
  label: string;
  sourceType: "rss" | "url" | "site";
  sourceUrl: string;
  preferredOutcome: "threads" | "wordpress";
  autoImportEnabled: boolean;
};

export type SourceStarterPack = {
  id: "taiwan-market" | "us-market" | "macro" | "etf-income" | "taiwan-research" | "us-research";
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
      },
      {
        label: "StockFeel 股感",
        sourceType: "site",
        sourceUrl: "https://www.stockfeel.com.tw/",
        preferredOutcome: "wordpress",
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
      },
      {
        label: "CNBC Markets",
        sourceType: "site",
        sourceUrl: "https://www.cnbc.com/markets/",
        preferredOutcome: "threads",
        autoImportEnabled: true
      },
      {
        label: "MarketWatch Markets",
        sourceType: "site",
        sourceUrl: "https://www.marketwatch.com/markets",
        preferredOutcome: "wordpress",
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
      },
      {
        label: "財經 M平方",
        sourceType: "site",
        sourceUrl: "https://www.macromicro.me/",
        preferredOutcome: "wordpress",
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
      },
      {
        label: "ETF Trends",
        sourceType: "site",
        sourceUrl: "https://www.etftrends.com/",
        preferredOutcome: "wordpress",
        autoImportEnabled: true
      }
    ]
  },
  {
    id: "taiwan-research",
    title: "台灣研究與理財深度站",
    shortLabel: "台灣深度",
    description: "偏研究、觀點和教學型內容，不一定每天都寫，但很適合沉成可複用的知識庫與長文草稿。",
    focus: "台灣理財教育 / 長文觀點 / 深度拆解",
    ingestHint: "優先用網站模式抓文章本體，再轉成觀點 Threads 或 WordPress 草稿。",
    bestFor: "想建立自己的投資 / 理財知識底稿與教學型 persona",
    items: [
      {
        label: "市場先生",
        sourceType: "site",
        sourceUrl: "https://rich01.com/",
        preferredOutcome: "wordpress",
        autoImportEnabled: true
      },
      {
        label: "StockFeel 深度文章",
        sourceType: "site",
        sourceUrl: "https://www.stockfeel.com.tw/",
        preferredOutcome: "wordpress",
        autoImportEnabled: true
      }
    ]
  },
  {
    id: "us-research",
    title: "美股研究與全球市場深度站",
    shortLabel: "美股深度",
    description: "偏美股研究、產業拆解與長文分析，適合拿來做觀點型 Threads 和 WordPress 延伸稿。",
    focus: "美股研究 / 產業拆解 / 長文分析",
    ingestHint: "以網站模式或可抓 feed 的研究站為主，重點是正文，不是首頁雜訊。",
    bestFor: "想從新聞快評再往產業 / 公司深度拆解延伸的 persona",
    items: [
      {
        label: "Seeking Alpha News",
        sourceType: "site",
        sourceUrl: "https://seekingalpha.com/market-news",
        preferredOutcome: "threads",
        autoImportEnabled: true
      },
      {
        label: "Barron's Markets",
        sourceType: "site",
        sourceUrl: "https://www.barrons.com/market-data",
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
