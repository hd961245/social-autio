import Parser from "rss-parser";
import { extractContentFromUrl } from "@/lib/content/url-ingest";

export type SourceWatchPreview = {
  title: string;
  url: string;
  excerpt: string;
  sourceType: "rss" | "url" | "site";
  fingerprint: string;
  publishedAt?: string;
  score?: number;
  normalizedTitle?: string;
  normalizedExcerpt?: string;
  normalizedText?: string;
  rationale?: string;
};

const rssParser = new Parser();
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36";

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

function uniq<T>(items: T[]) {
  return Array.from(new Set(items));
}

function absoluteUrl(baseUrl: string, value: string) {
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return null;
  }
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

async function fetchText(url: string, accept = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8") {
  const response = await fetch(url, {
    headers: {
      "User-Agent": DEFAULT_USER_AGENT,
      Accept: accept
    },
    redirect: "follow"
  });

  if (!response.ok) {
    throw new Error(`來源抓取失敗（${response.status}）`);
  }

  return {
    text: await response.text(),
    url: response.url || url
  };
}

function extractFeedLinks(html: string, baseUrl: string) {
  const links = [
    ...html.matchAll(/<link[^>]+type=["'][^"']*(?:rss|atom|xml)[^"']*["'][^>]+href=["']([^"']+)["']/gi),
    ...html.matchAll(/<a[^>]+href=["']([^"']+(?:feed|rss|atom|xml)[^"']*)["']/gi)
  ]
    .map((match) => absoluteUrl(baseUrl, match[1]))
    .filter(Boolean) as string[];

  const common = ["/feed", "/rss", "/rss.xml", "/feed.xml", "/atom.xml", "/index.xml"]
    .map((path) => absoluteUrl(baseUrl, path))
    .filter(Boolean) as string[];

  return uniq([...links, ...common]);
}

function isLikelyArticleUrl(url: string, host: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== host) return false;
    const path = parsed.pathname.toLowerCase();
    if (!path || path === "/" || path.length < 8) return false;
    if (/(\/tag\/|\/category\/|\/author\/|\/page\/|\/search|\/feed|\/rss|\/sitemap|\/wp-json|\/wp-admin|\/login|\/signup)/i.test(path)) {
      return false;
    }

    return (
      /\d{4}\/\d{1,2}\//.test(path) ||
      /(article|post|blog|news|research|analysis|market|stocks|invest|insight)/i.test(path) ||
      path.split("/").filter(Boolean).length >= 2
    );
  } catch {
    return false;
  }
}

function scoreDiscoveredArticle(url: string, title = "", lastmod?: string) {
  const path = url.toLowerCase();
  let score = 40;

  if (/\d{4}\/\d{1,2}\//.test(path)) score += 18;
  if (/(news|research|analysis|market|stocks|invest|blog|article)/i.test(path)) score += 14;
  if (/(taiwan|us|nasdaq|nyse|etf|stock|market|fed|earnings|台股|美股|財經|理財)/i.test(`${path} ${title}`)) score += 20;
  if (lastmod) score += 8;

  return score;
}

function parseSitemapUrls(xml: string) {
  return [...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)].map((match) => decodeXml(match[1]).trim()).filter(Boolean);
}

function parseSitemapLastmod(xml: string, targetUrl: string) {
  const escaped = targetUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = xml.match(new RegExp(`<url>[\\s\\S]*?<loc>${escaped}<\\/loc>[\\s\\S]*?<lastmod>([\\s\\S]*?)<\\/lastmod>[\\s\\S]*?<\\/url>`, "i"));
  return match ? decodeXml(match[1]).trim() : undefined;
}

async function discoverSiteCandidates(sourceUrl: string, limit: number): Promise<SourceWatchPreview[]> {
  const home = await fetchText(sourceUrl);
  const homeUrl = home.url;
  const host = new URL(homeUrl).hostname;
  const feedLinks = extractFeedLinks(home.text, homeUrl);

  for (const feedUrl of feedLinks.slice(0, 5)) {
    try {
      return await refreshSourceCandidates("rss", feedUrl, limit);
    } catch {}
  }

  const sitemapCandidates = uniq(
    [
      "/sitemap.xml",
      "/sitemap_index.xml",
      "/post-sitemap.xml",
      "/post-sitemap1.xml",
      "/news-sitemap.xml"
    ]
      .map((path) => absoluteUrl(homeUrl, path))
      .filter(Boolean) as string[]
  );

  const discoveredUrls: Array<{ url: string; lastmod?: string; title?: string }> = [];

  for (const sitemapUrl of sitemapCandidates) {
    try {
      const sitemap = await fetchText(sitemapUrl, "application/xml,text/xml;q=0.9,*/*;q=0.8");
      const locs = parseSitemapUrls(sitemap.text);
      const nested = locs.filter((item) => /sitemap/i.test(item)).slice(0, 4);

      if (nested.length > 0) {
        for (const child of nested) {
          try {
            const childMap = await fetchText(child, "application/xml,text/xml;q=0.9,*/*;q=0.8");
            const childLocs = parseSitemapUrls(childMap.text)
              .filter((item) => isLikelyArticleUrl(item, host))
              .slice(0, 20);
            for (const item of childLocs) {
              discoveredUrls.push({ url: item, lastmod: parseSitemapLastmod(childMap.text, item) });
            }
          } catch {}
        }
      } else {
        const articleLocs = locs.filter((item) => isLikelyArticleUrl(item, host)).slice(0, 20);
        for (const item of articleLocs) {
          discoveredUrls.push({ url: item, lastmod: parseSitemapLastmod(sitemap.text, item) });
        }
      }
    } catch {}
  }

  if (discoveredUrls.length === 0) {
    const links = [...home.text.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
      .map((match) => {
        const url = absoluteUrl(homeUrl, match[1]);
        return {
          url,
          title: stripMarkup(match[2] || "")
        };
      })
      .filter((item) => item.url && isLikelyArticleUrl(item.url, host)) as Array<{ url: string; title?: string }>;

    discoveredUrls.push(...links.slice(0, 20));
  }

  const ranked = uniq(discoveredUrls.map((item) => item.url)).map((url) => {
    const meta = discoveredUrls.find((item) => item.url === url);
    return {
      url,
      title: meta?.title,
      lastmod: meta?.lastmod,
      rank: scoreDiscoveredArticle(url, meta?.title, meta?.lastmod)
    };
  });

  const topLinks = ranked.sort((a, b) => b.rank - a.rank).slice(0, limit * 2);
  const hydrated = await Promise.all(
    topLinks.map(async (item) => {
      try {
        const extracted = await extractContentFromUrl(item.url);
        const score = scoreFinanceCandidate({ title: extracted.title, excerpt: extracted.excerpt }) + item.rank;
        return {
          title: extracted.title,
          url: extracted.resolvedUrl,
          excerpt: extracted.excerpt,
          sourceType: "site" as const,
          fingerprint: buildFingerprint(extracted.title, extracted.resolvedUrl, extracted.excerpt),
          publishedAt: item.lastmod,
          score,
          normalizedTitle: extracted.title,
          normalizedExcerpt: extracted.excerpt,
          normalizedText: extracted.text,
          rationale: buildCandidateRationale({
            title: extracted.title,
            excerpt: extracted.excerpt,
            normalizedExcerpt: extracted.excerpt,
            score,
            sourceType: "site"
          })
        };
      } catch {
        return null;
      }
    })
  );

  const candidates = hydrated.filter(Boolean) as SourceWatchPreview[];
  if (candidates.length === 0) {
    throw new Error("這個網站沒有找到可用文章，可能需要登入、反爬或站台結構較特殊。");
  }

  return sortCandidates(candidates).slice(0, limit);
}

function buildCandidateRationale(candidate: {
  title: string;
  excerpt: string;
  normalizedExcerpt?: string;
  score?: number;
  sourceType: "rss" | "url" | "site";
}) {
  const summary = candidate.normalizedExcerpt?.trim() || candidate.excerpt.trim();
  const reasons = [
    candidate.score ? `候選分數 ${candidate.score}` : "",
    candidate.sourceType === "rss" ? "來自 RSS 候選池" : "來自單篇文章頁",
    summary ? `摘要重點：${summary.slice(0, 110)}${summary.length > 110 ? "…" : ""}` : ""
  ].filter(Boolean);

  return reasons.join(" · ");
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
  if (sourceType === "site") {
    return discoverSiteCandidates(sourceUrl, limit);
  }

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
      score: scoreFinanceCandidate({ title: extracted.title, excerpt: extracted.excerpt }),
      normalizedTitle: extracted.title,
      normalizedExcerpt: extracted.excerpt,
      normalizedText: extracted.text,
      rationale: buildCandidateRationale({
        title: extracted.title,
        excerpt: extracted.excerpt,
        normalizedExcerpt: extracted.excerpt,
        score: scoreFinanceCandidate({ title: extracted.title, excerpt: extracted.excerpt }),
        sourceType: "url"
      })
    }
  ];
}

export async function hydrateSourceCandidate(candidate: SourceWatchPreview): Promise<SourceWatchPreview> {
  if (candidate.normalizedText?.trim()) {
    return {
      ...candidate,
      rationale:
        candidate.rationale ||
        buildCandidateRationale({
          title: candidate.title,
          excerpt: candidate.excerpt,
          normalizedExcerpt: candidate.normalizedExcerpt,
          score: candidate.score,
          sourceType: candidate.sourceType
        })
    };
  }

  try {
    const extracted = await extractContentFromUrl(candidate.url);
    return {
      ...candidate,
      title: extracted.title || candidate.title,
      url: extracted.resolvedUrl || candidate.url,
      excerpt: extracted.excerpt || candidate.excerpt,
      fingerprint: buildFingerprint(extracted.title || candidate.title, extracted.resolvedUrl || candidate.url, extracted.excerpt || candidate.excerpt),
      normalizedTitle: extracted.title,
      normalizedExcerpt: extracted.excerpt,
      normalizedText: extracted.text,
      rationale: buildCandidateRationale({
        title: extracted.title || candidate.title,
        excerpt: candidate.excerpt,
        normalizedExcerpt: extracted.excerpt,
        score: candidate.score,
        sourceType: candidate.sourceType
      })
    };
  } catch {
    return {
      ...candidate,
      rationale:
        candidate.rationale ||
        buildCandidateRationale({
          title: candidate.title,
          excerpt: candidate.excerpt,
          normalizedExcerpt: candidate.normalizedExcerpt,
          score: candidate.score,
          sourceType: candidate.sourceType
        })
    };
  }
}

export async function refreshSourceWatch(sourceType: string, sourceUrl: string): Promise<SourceWatchPreview> {
  const [first] = await refreshSourceCandidates(sourceType, sourceUrl, 1);

  if (!first) {
    throw new Error("來源目前沒有可用內容。");
  }

  return first;
}
