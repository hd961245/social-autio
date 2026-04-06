import { decryptString } from "@/lib/crypto";
import { threadsFetch } from "@/lib/platforms/threads/client";
import type { PostMetricsData, QuotaInfo, UserMetrics } from "@/lib/platforms/types";
import { prisma } from "@/lib/prisma";

type ThreadsMetricValue =
  | number
  | string
  | {
      value?: number | string;
    }
  | {
      total_value?: {
        value?: number | string;
      };
    };

type ThreadsMetricsResponse = {
  data?: Array<{
    name?: string;
    values?: Array<{ value?: number | string }>;
    total_value?: { value?: number | string };
  }>;
};

type ThreadsQuotaResponse = {
  data?: Array<{
    quota_usage?: number;
    config?: {
      quota_total?: number;
    };
    reply_quota_usage?: number;
  }>;
};

function toNumber(value: ThreadsMetricValue | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (value && typeof value === "object") {
    if ("value" in value) {
      return toNumber(value.value);
    }

    if ("total_value" in value) {
      return toNumber(value.total_value?.value);
    }
  }

  return 0;
}

async function getThreadsAccountContext(accountId: string) {
  const account = await prisma.platformAccount.findUnique({
    where: { id: accountId }
  });

  if (!account) {
    throw new Error("找不到指定的 Threads 帳號。");
  }

  return {
    account,
    accessToken: decryptString(account.accessToken)
  };
}

function getMetricMap(response: ThreadsMetricsResponse) {
  return new Map(
    (response.data ?? []).map((item) => [
      item.name ?? "",
      item.total_value?.value ?? item.values?.[0]?.value ?? 0
    ])
  );
}

export async function getThreadsUserMetrics(accountId: string): Promise<UserMetrics> {
  const { account, accessToken } = await getThreadsAccountContext(accountId);

  try {
    const response = await threadsFetch<ThreadsMetricsResponse>(
      `/${account.platformUserId}/threads_insights?metric=views,likes,replies,reposts,quotes,followers_count`,
      { accessToken }
    );
    const metrics = getMetricMap(response);

    return {
      followerCount: toNumber(metrics.get("followers_count")),
      views: toNumber(metrics.get("views")),
      likes: toNumber(metrics.get("likes")),
      replies: toNumber(metrics.get("replies")),
      reposts: toNumber(metrics.get("reposts")),
      quotes: toNumber(metrics.get("quotes"))
    };
  } catch {
    return {
      followerCount: 0,
      views: 0,
      likes: 0,
      replies: 0,
      reposts: 0,
      quotes: 0
    };
  }
}

export async function getThreadsPostMetrics(accountId: string, platformPostId: string): Promise<PostMetricsData> {
  const { accessToken } = await getThreadsAccountContext(accountId);

  try {
    const response = await threadsFetch<ThreadsMetricsResponse>(
      `/${platformPostId}/insights?metric=views,likes,replies,reposts,quotes,shares`,
      { accessToken }
    );
    const metrics = getMetricMap(response);

    return {
      views: toNumber(metrics.get("views")),
      likes: toNumber(metrics.get("likes")),
      replies: toNumber(metrics.get("replies")),
      reposts: toNumber(metrics.get("reposts")),
      quotes: toNumber(metrics.get("quotes")),
      shares: toNumber(metrics.get("shares"))
    };
  } catch {
    return {
      views: 0,
      likes: 0,
      replies: 0,
      reposts: 0,
      quotes: 0,
      shares: 0
    };
  }
}

export async function getThreadsPublishingQuota(accountId: string): Promise<QuotaInfo> {
  const { account, accessToken } = await getThreadsAccountContext(accountId);

  try {
    const response = await threadsFetch<ThreadsQuotaResponse>(
      `/${account.platformUserId}/threads_publishing_limit`,
      { accessToken }
    );
    const data = response.data?.[0];

    return {
      used: data?.quota_usage ?? 0,
      limit: data?.config?.quota_total ?? 250
    };
  } catch {
    return {
      used: 0,
      limit: 250
    };
  }
}
