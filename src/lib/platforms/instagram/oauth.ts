import { env } from "@/lib/env";
import { GRAPH_API_VERSION } from "./constants";

async function graphFetch(path: string, params: Record<string, string>) {
  const url = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url);
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`Instagram Graph API error (${res.status}): ${JSON.stringify(data ?? {})}`);
  }
  return data as Record<string, unknown>;
}

export function getInstagramAuthorizationUrl(state: string): string {
  const url = new URL(`https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth`);
  url.searchParams.set("client_id", env.instagramAppId());
  url.searchParams.set("redirect_uri", env.instagramRedirectUri());
  url.searchParams.set("scope", [
    "instagram_basic",
    "instagram_content_publish",
    "pages_show_list",
    "pages_read_engagement"
  ].join(","));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeCodeForShortLivedToken(code: string) {
  const data = await graphFetch("/oauth/access_token", {
    client_id: env.instagramAppId(),
    client_secret: env.instagramAppSecret(),
    redirect_uri: env.instagramRedirectUri(),
    code
  });
  return data.access_token as string;
}

export async function exchangeForLongLivedToken(shortLivedToken: string) {
  const data = await graphFetch("/oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: env.instagramAppId(),
    client_secret: env.instagramAppSecret(),
    fb_exchange_token: shortLivedToken
  });
  return {
    accessToken: data.access_token as string,
    expiresIn: (data.expires_in as number) ?? 5183944
  };
}

export async function getInstagramBusinessAccount(pageAccessToken: string, pageId: string) {
  const data = await graphFetch(`/${pageId}`, {
    fields: "instagram_business_account",
    access_token: pageAccessToken
  });
  const igAccount = data.instagram_business_account as { id: string } | undefined;
  return igAccount?.id ?? null;
}

// Returns the first Instagram Business Account linked to any of the user's pages
export async function resolveInstagramAccount(userAccessToken: string): Promise<{
  igUserId: string;
  pageId: string;
  pageAccessToken: string;
  username: string;
  name: string;
  profilePictureUrl?: string;
}> {
  // Step 1: get pages
  const pagesData = await graphFetch("/me/accounts", {
    fields: "id,name,access_token,instagram_business_account",
    access_token: userAccessToken
  });

  const pages = (pagesData.data as Array<{
    id: string;
    name: string;
    access_token: string;
    instagram_business_account?: { id: string };
  }>) ?? [];

  for (const page of pages) {
    const igId = page.instagram_business_account?.id;
    if (!igId) continue;

    // Step 2: get IG account details
    const igData = await graphFetch(`/${igId}`, {
      fields: "id,username,name,profile_picture_url",
      access_token: page.access_token
    });

    return {
      igUserId: igId,
      pageId: page.id,
      pageAccessToken: page.access_token,
      username: (igData.username as string) ?? page.name,
      name: (igData.name as string) ?? page.name,
      profilePictureUrl: igData.profile_picture_url as string | undefined
    };
  }

  throw new Error("找不到綁定的 Instagram 商業帳號。請確認 Facebook 粉絲專頁已連接 Instagram Business/Creator 帳號。");
}
