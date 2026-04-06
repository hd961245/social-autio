import type { PostMetricsData, UserMetrics } from "@/lib/platforms/types";

export async function getThreadsUserMetrics(): Promise<UserMetrics> {
  return {
    followerCount: 1840,
    views: 23200,
    likes: 1690,
    replies: 143,
    reposts: 62,
    quotes: 19
  };
}

export async function getThreadsPostMetrics(): Promise<PostMetricsData> {
  return {
    views: 4300,
    likes: 290,
    replies: 24,
    reposts: 8,
    quotes: 3,
    shares: 11
  };
}

