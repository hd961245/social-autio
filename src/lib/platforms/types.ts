export type PlatformId = "threads" | "wordpress" | "instagram" | "twitter";

export type PostContent = {
  text?: string;
  mediaUrls?: string[];
  topicTag?: string;
  replyToPostId?: string;
  contentType: "text" | "image" | "video" | "carousel";
};

export type TokenResult = {
  accessToken: string;
  refreshToken?: string;
  tokenType: "short_lived" | "long_lived";
  expiresAt: Date;
};

export type PublishResult = {
  platformPostId: string;
  url?: string;
};

export type PlatformPost = {
  id: string;
  text: string;
  username: string;
  timestamp: string;
};

export type UserMetrics = {
  followerCount: number;
  views: number;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
};

export type PostMetricsData = {
  views: number;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
  shares: number;
};

export type QuotaInfo = {
  used: number;
  limit: number;
};

export type PlatformConstraints = {
  maxTextLength: number;
  maxMediaItems: number;
  supportedMediaTypes: Array<"text" | "image" | "video" | "carousel">;
  maxHashtags: number;
  publishDelaySeconds: number;
};

export interface PlatformAdapter {
  platformId: PlatformId;
  displayName: string;
  constraints: PlatformConstraints;
  getAuthorizationUrl(state: string): string;
  exchangeCodeForToken(code: string): Promise<TokenResult>;
  refreshToken(accountId: string): Promise<TokenResult>;
  createPost(accountId: string, content: PostContent): Promise<PublishResult>;
  deletePost(accountId: string, platformPostId: string): Promise<void>;
  replyToPost(accountId: string, targetPostId: string, text: string): Promise<PublishResult>;
  getUserMetrics(accountId: string, since: Date, until: Date): Promise<UserMetrics>;
  getPostMetrics(accountId: string, platformPostId: string): Promise<PostMetricsData>;
  getOwnPosts(accountId: string, since: Date): Promise<PlatformPost[]>;
  getPostReplies(accountId: string, platformPostId: string): Promise<PlatformPost[]>;
  getPublishingQuota(accountId: string): Promise<QuotaInfo>;
}

