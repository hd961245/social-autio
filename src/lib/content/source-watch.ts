import Parser from "rss-parser";
import { extractContentFromUrl } from "@/lib/content/url-ingest";

export type SourceWatchPreview = {
  title: string;
  url: string;
  excerpt: string;
  sourceType: "rss" | "url";
  fingerprint: string;
  publishedAt?: string;
  score?: number;
};

const rssParser = new Parser();

function buildFingerprint(title: string, url: string, excerpt: string) {
  return Buffer.from(`${title}::${url}::${excerpt.slice(0, 160)}`).toString("base64").slice(0, 120);
}

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function stripMarkup(value: string) {
  return decodeXml(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function readTag(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? stripMarkup(match[1]) : "";
}

function readRawTag(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXml(match[1]).trim() : "";
}

function scoreFinanceCandidate(item: { title: string; excerpt: string }) {
  const text = `${item.title} ${item.excerpt}`.toLowerCase();
  const keywords = [
    "etf",
    "fed",
    "fomc",
    "inflation",
    "interest rate",
    "rates",
    "yield",
    "stock",
    "stocks",
    "nasdaq",
    "s&p",
    "earnings",
    "crypto",
    "bitcoin",
    "taiwan",
    "台股",
    "美股",
    "理財",
    "投資",
    "通膨",
    "利率",
    "債券",
    "基金",
    "券商",
    "配息",
    "市場",
    "財報"
  ];

  const keywordHits = keywords.reduce((count, keyword) => count + (text.includes(keyword) ? 1 : 0), 0);
  const titleBonus = item.title.length >= 16 && item.title.length <= 56 ? 2 : 0;
  return keywordHits * 8 + titleBonus;
}

function sortCandidates(items: SourceWatchPreview[]) {
  return [...items].sort((left, right) => {
    const rightScore = right.score ?? 0;
    const leftScore = left.score ?? 0;

    if (rightScore !== leftScore) {
      return rightScore - leftScore;
    }

    const rightTime = right.publishedAt ? new Date(right.publishedAt).getTime() : 0;
    const leftTime = left.publishedAt ? new Date(left.publishedAt).getTime() : 0;
    return rightTime - leftTime;
  });
}

function parseFallbackXmlCandidates(xml: string, sourceUrl: string) {
  const itemBlocks = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((match) => match[0]);
  const entryBlocks = itemBlocks.length > 0 ? itemBlocks : [...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].map((match) => match[0]);

  if (entryBlocks.length === 0) {
    throw new Error("這個 RSS / Atom 來源目前沒有抓到文章項目。");
  }

  return entryBlocks
    .map((item) => {
      const title = readTag(item, "title") || "未命名來源";
      const excerpt = readTag(item, "description") || readTag(item, "summary") || readTag(item, "content") || "";
      const link =
        item.match(/<link>([\s\S]*?)<\/link>/i)?.[1]?.trim() ||
        item.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1]?.trim() ||
        sourceUrl;
      const publishedAt = readRawTag(item, "pubDate") || readRawTag(item, "published") || readRawTag(item, "updated");

      return {
        title,
        url: decodeXml(link),
        excerpt: excerpt.slice(0, 300),
        sourceType: "rss" as const,
        fingerprint: buildFingerprint(title, decodeXml(link), excerpt),
        publishedAt: publishedAt || undefined,
        score: scoreFinanceCandidate({ title, excerpt })
      };
    })
    .filter((item) => item.url);
}

export async function refreshSourceCandidates(sourceType: string, sourceUrl: string, limit = 5): Promise<SourceWatchPreview[]> {
  if (sourceType === "rss") {
    try {
      const feed = await rssParser.parseURL(sourceUrl);
      const candidates = (feed.items ?? [])
        .map((item) => {
          const title = stripMarkup(item.title ?? "") || feed.title || "未命名來源";
          const excerpt = stripMarkup(
            item.contentSnippet ?? item.content ?? item.summary ?? item["content:encoded"] ?? feed.description ?? ""
          );
          const link = item.link?.trim() || item.guid?.trim() || sourceUrl;
          const publishedAt = item.isoDate || item.pubDate || undefined;

          return {
            title,
            url: decodeXml(link),
            excerpt: excerpt.slice(0, 300),
            sourceType: "rss" as const,
            fingerprint: buildFingerprint(title, decodeXml(link), excerpt),
            publishedAt,
            score: scoreFinanceCandidate({ title, excerpt })
          };
        })
        .filter((item) => item.url);

      if (candidates.length === 0) {
        throw new Error("這個 RSS / Atom 來源目前沒有抓到文章項目。");
      }

      return sortCandidates(candidates).slice(0, limit);
    } catch {
      const response = await fetch(sourceUrl, {
        headers: {
          Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8"
        }
      });

      if (!response.ok) {
        throw new Error(`RSS 抓取失敗（${response.status}）`);
      }

      const xml = await response.text();
      return sortCandidates(parseFallbackXmlCandidates(xml, sourceUrl)).slice(0, limit);
    }
  }

  const extracted = await extractContentFromUrl(sourceUrl);

  return [
    {
      title: extracted.title,
      url: extracted.resolvedUrl,
      excerpt: extracted.excerpt,
      sourceType: "url",
      fingerprint: buildFingerprint(extracted.title, extracted.resolvedUrl, extracted.excerpt),
      score: scoreFinanceCandidate({ title: extracted.title, excerpt: extracted.excerpt })
    }
  ];
}

export async function refreshSourceWatch(sourceType: string, sourceUrl: string): Promise<SourceWatchPreview> {
  const [first] = await refreshSourceCandidates(sourceType, sourceUrl, 1);

  if (!first) {
    throw new Error("來源目前沒有可用內容。");
  }

  return first;
}
