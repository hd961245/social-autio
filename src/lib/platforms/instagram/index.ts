import { getInstagramAuthorizationUrl, exchangeCodeForShortLivedToken, exchangeForLongLivedToken, resolveInstagramAccount } from "./oauth";
import { publishToInstagram } from "./publisher";
import type { PlatformAdapter } from "@/lib/platforms/types";

export const instagramAdapter: PlatformAdapter = {
  platformId: "instagram",
  displayName: "Instagram",
  constraints: {
    maxTextLength: 2200,
    maxMediaItems: 10,
    supportedMediaTypes: ["image", "video", "carousel"],
    maxHashtags: 30,
    publishDelaySeconds: 30
  },
  getAuthorizationUrl(state) {
    return getInstagramAuthorizationUrl(state);
  },
  async exchangeCodeForToken(code) {
    const shortLived = await exchangeCodeForShortLivedToken(code);
    const longLived = await exchangeForLongLivedToken(shortLived);
    return {
      accessToken: longLived.accessToken,
      tokenType: "long_lived",
      expiresAt: new Date(Date.now() + longLived.expiresIn * 1000)
    };
  },
  async refreshToken() {
    throw new Error("Instagram token refresh not yet implemented.");
  },
  async createPost(accountId, content) {
    return publishToInstagram(accountId, content);
  },
  async deletePost() {},
  async replyToPost() {
    throw new Error("Instagram reply not supported via Graph API.");
  },
  async getUserMetrics() {
    return { followerCount: 0, views: 0, likes: 0, replies: 0, reposts: 0, quotes: 0 };
  },
  async getPostMetrics() {
    return { views: 0, likes: 0, replies: 0, reposts: 0, quotes: 0, shares: 0 };
  },
  async getOwnPosts() {
    return [];
  },
  async getPostReplies() {
    return [];
  },
  async getPublishingQuota() {
    return { used: 0, limit: 50 };
  }
};
