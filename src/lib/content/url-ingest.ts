import { Readability, isProbablyReaderable } from "@mozilla/readability";
import { JSDOM } from "jsdom";

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36";

type UrlExtractionResult = {
  url: string;
  resolvedUrl: string;
  title: string;
  text: string;
  excerpt: string;
  sourceLabel: "threads" | "facebook" | "wordpress" | "blog" | "generic";
};

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function normalizeText(value: string) {
  return decodeHtml(value)
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function stripHtml(value: string) {
  return normalizeText(
    decodeHtml(value)
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " ")
  );
}

function extractMeta(html: string, property: string) {
  const regex = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i"
  );
  return decodeHtml(html.match(regex)?.[1] ?? "").trim();
}

function extractTitle(html: string) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
  return stripHtml(title);
}

function inferSourceLabel(url: URL): UrlExtractionResult["sourceLabel"] {
  const host = url.hostname.toLowerCase();

  if (host.includes("threads.net")) {
    return "threads";
  }

  if (host.includes("facebook.com") || host.includes("fb.com")) {
    return "facebook";
  }

  if (host.includes("wordpress")) {
    return "wordpress";
  }

  return host ? "blog" : "generic";
}

function trimExcerpt(value: string, maxLength: number) {
  return value.slice(0, maxLength).trim();
}

function extractReadableArticle(html: string, resolvedUrl: string) {
  try {
    const dom = new JSDOM(html, {
      url: resolvedUrl
    });
    const document = dom.window.document;

    if (!isProbablyReaderable(document)) {
      return null;
    }

    const reader = new Readability(document, {
      keepClasses: false,
      maxElemsToParse: 0
    });

    return reader.parse();
  } catch {
    return null;
  }
}

export async function extractContentFromUrl(inputUrl: string): Promise<UrlExtractionResult> {
  const response = await fetch(inputUrl, {
    headers: {
      "User-Agent": DEFAULT_USER_AGENT,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    },
    redirect: "follow"
  });

  if (!response.ok) {
    throw new Error(`抓取網址失敗（${response.status}）`);
  }

  const html = await response.text();
  const resolvedUrl = response.url || inputUrl;
  const resolved = new URL(resolvedUrl);
  const sourceLabel = inferSourceLabel(resolved);
  const ogTitle = extractMeta(html, "og:title");
  const ogDescription = extractMeta(html, "og:description");
  const description = extractMeta(html, "description");
  const readable = extractReadableArticle(html, resolvedUrl);
  const readableTitle = normalizeText(readable?.title ?? "");
  const readableText = normalizeText(readable?.textContent ?? "");
  const readableExcerpt = normalizeText(readable?.excerpt ?? "");
  const fallbackBody = stripHtml(html);
  const text = [readableText, ogDescription, description, fallbackBody]
    .filter(Boolean)
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const title = readableTitle || ogTitle || extractTitle(html) || resolved.hostname;
  const excerpt = trimExcerpt(readableExcerpt || ogDescription || description || fallbackBody, 280);

  if (!text) {
    throw new Error("這個網址沒有抓到可用內容，可能需要登入、JavaScript 渲染或平台限制。");
  }

  return {
    url: inputUrl,
    resolvedUrl,
    title,
    text: trimExcerpt(text, 12000),
    excerpt,
    sourceLabel
  };
}
