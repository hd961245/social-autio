import { env } from "@/lib/env";
import type { TokenResult } from "@/lib/platforms/types";

type ThreadsRefreshResponse = {
  access_token: string;
  token_type?: string;
  expires_in: number;
};

export async function refreshThreadsToken(currentAccessToken: string): Promise<TokenResult> {
  const url = new URL("https://graph.threads.net/refresh_access_token");
  url.searchParams.set("grant_type", "th_refresh_token");
  url.searchParams.set("access_token", currentAccessToken);
  url.searchParams.set("client_secret", env.threadsAppSecret());

  const response = await fetch(url);

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Threads token refresh failed (${response.status}): ${message}`);
  }

  const payload = (await response.json()) as ThreadsRefreshResponse;

  return {
    accessToken: payload.access_token,
    tokenType: "long_lived",
    expiresAt: new Date(Date.now() + payload.expires_in * 1000)
  };
}
