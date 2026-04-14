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

function stripHtml(value: string) {
  return decodeHtml(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

  return "blog";
}

function trimExcerpt(value: string, maxLength: number) {
  return value.slice(0, maxLength).trim();
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
  const articleBody = stripHtml(html);
  const text = [ogTitle, ogDescription, description, articleBody]
    .filter(Boolean)
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const title = ogTitle || extractTitle(html) || resolved.hostname;
  const excerpt = trimExcerpt(ogDescription || description || articleBody, 280);

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
