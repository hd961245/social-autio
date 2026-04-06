import { publishToWordPress } from "@/lib/platforms/wordpress/publisher";
import type { PlatformAdapter } from "@/lib/platforms/types";

export const wordpressAdapter: PlatformAdapter = {
  platformId: "wordpress",
  displayName: "WordPress",
  constraints: {
    maxTextLength: 100000,
    maxMediaItems: 50,
    supportedMediaTypes: ["text", "image", "video"],
    maxHashtags: 999,
    publishDelaySeconds: 0
  },
  getAuthorizationUrl() {
    return "/wordpress";
  },
  async exchangeCodeForToken() {
    throw new Error("WordPress does not use OAuth in this version.");
  },
  async refreshToken() {
    throw new Error("WordPress Application Password does not support token refresh.");
  },
  async createPost(accountId, content) {
    return publishToWordPress(accountId, content);
  },
  async deletePost() {},
  async replyToPost() {
    throw new Error("WordPress does not support replyToPost in this adapter.");
  },
  async getUserMetrics() {
    return {
      followerCount: 0,
      views: 0,
      likes: 0,
      replies: 0,
      reposts: 0,
      quotes: 0
    };
  },
  async getPostMetrics() {
    return {
      views: 0,
      likes: 0,
      replies: 0,
      reposts: 0,
      quotes: 0,
      shares: 0
    };
  },
  async getOwnPosts() {
    return [];
  },
  async getPostReplies() {
    return [];
  },
  async getPublishingQuota() {
    return {
      used: 0,
      limit: 9999
    };
  }
};

