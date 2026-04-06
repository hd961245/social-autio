import { env } from "@/lib/env";
import { z } from "zod";

const callbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1)
});

const tokenResponseSchema = z.object({
  access_token: z.string(),
  user_id: z.union([z.string(), z.number()]).transform(String)
});

const longLivedTokenSchema = z.object({
  access_token: z.string(),
  token_type: z.string().optional(),
  expires_in: z.number()
});

const profileSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  username: z.string(),
  threads_profile_picture_url: z.string().url().optional()
});

async function parseJsonResponse(response: Response) {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      `Threads OAuth request failed (${response.status}): ${JSON.stringify(data ?? { message: "Unknown error" })}`
    );
  }

  return data;
}

export function getThreadsAuthorizationUrl(state: string) {
  const clientId = env.threadsAppId();
  const redirectUri = env.threadsRedirectUri();

  const url = new URL("https://threads.net/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", [
    "threads_basic",
    "threads_content_publish",
    "threads_manage_replies",
    "threads_read_replies",
    "threads_manage_insights"
  ].join(","));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);

  return url.toString();
}

export function parseThreadsCallback(searchParams: Record<string, string | undefined>) {
  return callbackSchema.parse({
    code: searchParams.code,
    state: searchParams.state
  });
}

export async function exchangeCodeForShortLivedToken(code: string) {
  const response = await fetch("https://graph.threads.net/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: env.threadsAppId(),
      client_secret: env.threadsAppSecret(),
      grant_type: "authorization_code",
      redirect_uri: env.threadsRedirectUri(),
      code
    })
  });

  return tokenResponseSchema.parse(await parseJsonResponse(response));
}

export async function exchangeLongLivedToken(shortLivedToken: string) {
  const url = new URL("https://graph.threads.net/access_token");
  url.searchParams.set("grant_type", "th_exchange_token");
  url.searchParams.set("client_secret", env.threadsAppSecret());
  url.searchParams.set("access_token", shortLivedToken);

  const response = await fetch(url);
  return longLivedTokenSchema.parse(await parseJsonResponse(response));
}

export async function getThreadsProfile(accessToken: string) {
  const url = new URL("https://graph.threads.net/v1.0/me");
  url.searchParams.set("fields", "id,username,threads_profile_picture_url");
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url);
  return profileSchema.parse(await parseJsonResponse(response));
}
