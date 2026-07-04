import { decryptString } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { GRAPH_API_VERSION } from "./constants";
import type { PostContent, PublishResult } from "@/lib/platforms/types";

async function graphPost(path: string, body: Record<string, string>) {
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body)
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`Instagram publish error (${res.status}): ${JSON.stringify(data ?? {})}`);
  }
  return data as Record<string, unknown>;
}

export async function publishToInstagram(accountId: string, content: PostContent): Promise<PublishResult> {
  const account = await prisma.platformAccount.findUnique({ where: { id: accountId } });
  if (!account) throw new Error("找不到 Instagram 帳號。");

  const accessToken = decryptString(account.accessToken);
  const igUserId = account.platformUserId;
  const caption = content.text ?? "";

  // Instagram requires at least one image URL; text-only is not supported
  const imageUrl = content.mediaUrls?.[0] ?? content.featuredImageUrl;
  if (!imageUrl) {
    throw new Error("Instagram 發文需要至少一張圖片 URL（mediaUrls 或 featuredImageUrl）。");
  }

  // Step 1: create media container
  const containerBody: Record<string, string> = {
    image_url: imageUrl,
    caption,
    access_token: accessToken
  };
  const container = await graphPost(`/${igUserId}/media`, containerBody);
  const creationId = container.id as string;

  // Step 2: publish
  const published = await graphPost(`/${igUserId}/media_publish`, {
    creation_id: creationId,
    access_token: accessToken
  });

  const platformPostId = published.id as string;
  return {
    platformPostId,
    url: `https://www.instagram.com/p/${platformPostId}/`
  };
}
