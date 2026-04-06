import { getThreadsPostMetrics, getThreadsPublishingQuota, getThreadsUserMetrics } from "@/lib/platforms/threads/insights";
import { exchangeCodeForShortLivedToken, exchangeLongLivedToken, getThreadsAuthorizationUrl } from "@/lib/platforms/threads/oauth";
import { publishToThreads } from "@/lib/platforms/threads/publisher";
import { refreshThreadsToken } from "@/lib/platforms/threads/tokens";
import type { PlatformAdapter } from "@/lib/platforms/types";
import { decryptString, encryptString } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

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
    throw new Error("Account id is required for token refresh.");
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
  async getUserMetrics(accountId) {
    return getThreadsUserMetrics(accountId);
  },
  async getPostMetrics(accountId, platformPostId) {
    return getThreadsPostMetrics(accountId, platformPostId);
  },
  async getOwnPosts() {
    return [];
  },
  async getPostReplies() {
    return [];
  },
  async getPublishingQuota(accountId) {
    return getThreadsPublishingQuota(accountId);
  }
};

threadsAdapter.refreshToken = async (accountId) => {
  const account = await prisma.platformAccount.findUnique({
    where: { id: accountId }
  });

  if (!account) {
    throw new Error("找不到指定的 Threads 帳號。");
  }

  const token = await refreshThreadsToken(decryptString(account.accessToken));

  await prisma.platformAccount.update({
    where: { id: account.id },
    data: {
      accessToken: encryptString(token.accessToken),
      tokenType: token.tokenType,
      tokenExpiresAt: token.expiresAt,
      isActive: true
    }
  });

  return token;
};
