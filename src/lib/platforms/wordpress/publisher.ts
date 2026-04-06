import type { PostContent, PublishResult } from "@/lib/platforms/types";
import { getWordPressAccountContext, wordpressFetch, wordpressRawFetch } from "@/lib/platforms/wordpress/client";

type WordPressPostResponse = {
  id: number;
  link?: string;
};

type WordPressTermResponse = {
  id: number;
  name: string;
};

type WordPressMediaResponse = {
  id: number;
};

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeWordPressContent(content: PostContent) {
  const raw = content.text?.trim() ?? "";
  const title = content.title?.trim() || raw.split("\n").find(Boolean)?.slice(0, 80) || "Social Audio Draft";
  const body = content.html?.trim()
    ? content.html
    : raw
        .split("\n")
        .filter(Boolean)
        .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
        .join("");

  return {
    title,
    excerpt: content.excerpt?.trim() || raw.slice(0, 140),
    html: body || `<p>${escapeHtml(raw)}</p>`
  };
}

async function getOrCreateTermIds(
  siteUrl: string,
  username: string,
  appPassword: string,
  taxonomy: "categories" | "tags",
  names: string[] | undefined
) {
  if (!names?.length) {
    return [];
  }

  const ids: number[] = [];

  for (const name of names.map((item) => item.trim()).filter(Boolean)) {
    const existing = await wordpressFetch<WordPressTermResponse[]>(
      siteUrl,
      username,
      appPassword,
      `/wp-json/wp/v2/${taxonomy}?search=${encodeURIComponent(name)}&per_page=100`
    );

    const exact = existing.find((term) => term.name.toLowerCase() === name.toLowerCase());

    if (exact) {
      ids.push(exact.id);
      continue;
    }

    const created = await wordpressFetch<WordPressTermResponse>(
      siteUrl,
      username,
      appPassword,
      `/wp-json/wp/v2/${taxonomy}`,
      {
        method: "POST",
        body: JSON.stringify({ name })
      }
    );

    ids.push(created.id);
  }

  return ids;
}

async function uploadFeaturedImage(
  siteUrl: string,
  username: string,
  appPassword: string,
  featuredImageUrl: string | undefined
) {
  if (!featuredImageUrl) {
    return undefined;
  }

  const remoteResponse = await fetch(featuredImageUrl);

  if (!remoteResponse.ok) {
    throw new Error("無法下載特色圖片 URL。");
  }

  const buffer = Buffer.from(await remoteResponse.arrayBuffer());
  const filename = featuredImageUrl.split("/").pop()?.split("?")[0] || `featured-${Date.now()}.jpg`;
  const contentType = remoteResponse.headers.get("content-type") || "image/jpeg";

  const media = await wordpressRawFetch<WordPressMediaResponse>(siteUrl, username, appPassword, "/wp-json/wp/v2/media", {
    method: "POST",
    headers: {
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": contentType
    },
    body: buffer
  });

  return media.id;
}

export async function publishToWordPress(accountId: string, content: PostContent): Promise<PublishResult> {
  const account = await getWordPressAccountContext(accountId);
  const normalized = normalizeWordPressContent(content);
  const [categoryIds, tagIds, featuredMediaId] = await Promise.all([
    getOrCreateTermIds(account.siteUrl, account.username, account.appPassword, "categories", content.categories),
    getOrCreateTermIds(account.siteUrl, account.username, account.appPassword, "tags", content.tags),
    uploadFeaturedImage(account.siteUrl, account.username, account.appPassword, content.featuredImageUrl)
  ]);

  const status = content.replyToPostId ? "draft" : "publish";

  const post = await wordpressFetch<WordPressPostResponse>(
    account.siteUrl,
    account.username,
    account.appPassword,
    "/wp-json/wp/v2/posts",
    {
      method: "POST",
      body: JSON.stringify({
        title: normalized.title,
        content: normalized.html,
        excerpt: normalized.excerpt,
        status,
        categories: categoryIds,
        tags: tagIds,
        featured_media: featuredMediaId
      })
    }
  );

  return {
    platformPostId: String(post.id),
    url: post.link
  };
}
