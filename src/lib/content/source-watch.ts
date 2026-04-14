import { extractContentFromUrl } from "@/lib/content/url-ingest";

type SourceWatchPreview = {
  title: string;
  url: string;
  excerpt: string;
  sourceType: "rss" | "url";
};

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

export async function refreshSourceWatch(sourceType: string, sourceUrl: string): Promise<SourceWatchPreview> {
  if (sourceType === "rss") {
    const response = await fetch(sourceUrl, {
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8"
      }
    });

    if (!response.ok) {
      throw new Error(`RSS 抓取失敗（${response.status}）`);
    }

    const xml = await response.text();
    const item = xml.match(/<item\b[\s\S]*?<\/item>/i)?.[0] || xml.match(/<entry\b[\s\S]*?<\/entry>/i)?.[0];

    if (!item) {
      throw new Error("這個 RSS / Atom 來源目前沒有抓到文章項目。");
    }

    const title = readTag(item, "title") || "未命名來源";
    const excerpt = readTag(item, "description") || readTag(item, "summary") || readTag(item, "content") || "";
    const link =
      item.match(/<link>([\s\S]*?)<\/link>/i)?.[1]?.trim() ||
      item.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1]?.trim() ||
      sourceUrl;

    return {
      title,
      url: decodeXml(link),
      excerpt: excerpt.slice(0, 300),
      sourceType: "rss"
    };
  }

  const extracted = await extractContentFromUrl(sourceUrl);

  return {
    title: extracted.title,
    url: extracted.resolvedUrl,
    excerpt: extracted.excerpt,
    sourceType: "url"
  };
}
