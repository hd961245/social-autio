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
  sourceLabel: "threads" | "facebook" | "wordpress" | "blog" | "youtube" | "generic";
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

  if (host.includes("youtube.com") || host.includes("youtu.be")) {
    return "youtube";
  }

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

function isYouTubeUrl(url: URL) {
  const host = url.hostname.toLowerCase();
  return host.includes("youtube.com") || host.includes("youtu.be");
}

function extractYouTubeVideoId(url: URL) {
  const host = url.hostname.toLowerCase();
  if (host.includes("youtu.be")) {
    return url.pathname.replace(/^\//, "").trim();
  }

  if (url.searchParams.get("v")) {
    return url.searchParams.get("v")?.trim() || "";
  }

  const parts = url.pathname.split("/").filter(Boolean);
  const embedIndex = parts.findIndex((part) => part === "embed" || part === "shorts" || part === "live");
  if (embedIndex >= 0) {
    return parts[embedIndex + 1] ?? "";
  }

  return "";
}

function decodeEscapedJson(value: string) {
  return value
    .replace(/\\u0026/g, "&")
    .replace(/\\u003d/g, "=")
    .replace(/\\u0025/g, "%")
    .replace(/\\\//g, "/");
}

async function extractYouTubeTranscript(inputUrl: string, resolvedUrl: string) {
  const url = new URL(resolvedUrl);
  const videoId = extractYouTubeVideoId(url);

  if (!videoId) {
    throw new Error("這個 YouTube 網址沒有解析出有效的影片 ID。");
  }

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const watchResponse = await fetch(watchUrl, {
    headers: {
      "User-Agent": DEFAULT_USER_AGENT,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    },
    redirect: "follow"
  });

  if (!watchResponse.ok) {
    throw new Error(`抓取 YouTube 影片頁失敗（${watchResponse.status}）`);
  }

  const html = await watchResponse.text();
  const title = extractMeta(html, "og:title") || extractTitle(html) || "YouTube 影片";
  const description = extractMeta(html, "og:description");
  const captionTracksMatch = html.match(/"captionTracks":(\[[\s\S]*?\])/);

  if (!captionTracksMatch) {
    throw new Error("這支 YouTube 影片目前抓不到可用字幕，可能尚未提供 captions。");
  }

  let captionTracks: Array<{ baseUrl?: string; languageCode?: string; name?: { simpleText?: string } }> = [];
  try {
    captionTracks = JSON.parse(decodeEscapedJson(captionTracksMatch[1]));
  } catch {
    throw new Error("這支 YouTube 影片的字幕資料解析失敗。");
  }

  const preferredTrack =
    captionTracks.find((track) => (track.languageCode || "").toLowerCase().startsWith("zh")) ||
    captionTracks.find((track) => (track.languageCode || "").toLowerCase().startsWith("en")) ||
    captionTracks[0];

  if (!preferredTrack?.baseUrl) {
    throw new Error("這支 YouTube 影片沒有可讀取的字幕軌。");
  }

  const transcriptUrl = preferredTrack.baseUrl.includes("&fmt=")
    ? preferredTrack.baseUrl
    : `${preferredTrack.baseUrl}&fmt=vtt`;
  const transcriptResponse = await fetch(transcriptUrl, {
    headers: {
      "User-Agent": DEFAULT_USER_AGENT,
      Accept: "text/vtt,text/plain,application/xml;q=0.9,*/*;q=0.8"
    },
    redirect: "follow"
  });

  if (!transcriptResponse.ok) {
    throw new Error(`抓取 YouTube 字幕失敗（${transcriptResponse.status}）`);
  }

  const transcriptRaw = await transcriptResponse.text();
  const transcriptText = normalizeText(
    transcriptRaw
      .replace(/^WEBVTT[\s\S]*?\n\n/, "")
      .replace(/^\d+\s*$/gm, "")
      .replace(/\d{2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3}.*/g, "")
      .replace(/\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}\.\d{3}.*/g, "")
      .replace(/<[^>]+>/g, " ")
  );

  if (!transcriptText.trim()) {
    throw new Error("這支 YouTube 影片的字幕內容是空的。");
  }

  const normalizedTranscript = `YouTube transcript\n影片標題：${title}\n\n${transcriptText}`;

  return {
    url: inputUrl,
    resolvedUrl: watchUrl,
    title,
    text: trimExcerpt(normalizedTranscript, 12000),
    excerpt: trimExcerpt(description || transcriptText, 280),
    sourceLabel: "youtube" as const
  };
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
  const initialUrl = new URL(inputUrl);

  if (isYouTubeUrl(initialUrl)) {
    return extractYouTubeTranscript(inputUrl, inputUrl);
  }

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

  if (isYouTubeUrl(resolved)) {
    return extractYouTubeTranscript(inputUrl, resolvedUrl);
  }

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
