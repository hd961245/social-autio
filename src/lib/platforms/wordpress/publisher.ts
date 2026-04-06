import type { PostContent, PublishResult } from "@/lib/platforms/types";
import { getWordPressAccountContext, wordpressFetch } from "@/lib/platforms/wordpress/client";

type WordPressPostResponse = {
  id: number;
  link?: string;
};

function normalizeWordPressContent(content: PostContent) {
  const raw = content.text?.trim() ?? "";
  const [firstLine, ...rest] = raw.split("\n").filter(Boolean);
  const title = firstLine?.slice(0, 80) || "Social Audio Draft";
  const body = rest.length ? rest.join("\n\n") : raw;
  const html = body
    .split("\n")
    .filter(Boolean)
    .map((paragraph) => `<p>${paragraph}</p>`)
    .join("");

  return { title, html: html || `<p>${raw}</p>` };
}

export async function publishToWordPress(accountId: string, content: PostContent): Promise<PublishResult> {
  const account = await getWordPressAccountContext(accountId);
  const normalized = normalizeWordPressContent(content);

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
        status: "publish"
      })
    }
  );

  return {
    platformPostId: String(post.id),
    url: post.link
  };
}

