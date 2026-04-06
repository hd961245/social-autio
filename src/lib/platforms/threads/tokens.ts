import type { TokenResult } from "@/lib/platforms/types";

export async function refreshThreadsToken(): Promise<TokenResult> {
  return {
    accessToken: "refreshed-demo-token",
    tokenType: "long_lived",
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60)
  };
}

