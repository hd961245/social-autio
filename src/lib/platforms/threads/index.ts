import { getThreadsUserMetrics, getThreadsPostMetrics } from "@/lib/platforms/threads/insights";
import { exchangeCodeForShortLivedToken, exchangeLongLivedToken, getThreadsAuthorizationUrl } from "@/lib/platforms/threads/oauth";
import { publishToThreads } from "@/lib/platforms/threads/publisher";
import { refreshThreadsToken } from "@/lib/platforms/threads/tokens";
import type { PlatformAdapter } from "@/lib/platforms/types";

export const threadsAdapter: PlatformAdapter = {
  platformId: "threads",
  displayName: "Threads",
  constraints: {
    maxTextLength: 500,
    maxMediaItems: 20,
    supportedMediaTypes: ["text", "image", "video", "carousel"],
    maxHashtags: 1,
    publishDelaySeconds: 30
  },
  getAuthorizationUrl(state) {
    return getThreadsAuthorizationUrl(state);
  },
  async exchangeCodeForToken(code) {
    const shortLived = await exchangeCodeForShortLivedToken(code);
    const longLived = await exchangeLongLivedToken(shortLived.access_token);

    return {
      accessToken: longLived.access_token,
      tokenType: "long_lived",
      expiresAt: new Date(Date.now() + longLived.expires_in * 1000)
    };
  },
  async refreshToken() {
    return refreshThreadsToken();
  },
  async createPost(accountId, content) {
    return publishToThreads(accountId, content);
  },
  async deletePost() {},
  async replyToPost(accountId, targetPostId, text) {
    return {
      platformPostId: `reply-${targetPostId}`,
      url: `https://threads.net/@demo/post/${accountId}-${encodeURIComponent(text)}`
    };
  },
  async getUserMetrics() {
    return getThreadsUserMetrics();
  },
  async getPostMetrics() {
    return getThreadsPostMetrics();
  },
  async getOwnPosts() {
    return [];
  },
  async getPostReplies() {
    return [];
  },
  async getPublishingQuota() {
    return {
      used: 8,
      limit: 250
    };
  }
};
