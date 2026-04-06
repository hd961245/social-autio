import { getPlatformAdapter } from "@/lib/platforms";
import { prisma } from "@/lib/prisma";

export async function collectMetricsSnapshots() {
  const accounts = await prisma.platformAccount.findMany({
    where: {
      isActive: true
    },
    include: {
      posts: {
        where: {
          status: "published",
          platformPostId: {
            not: null
          }
        },
        orderBy: {
          publishedAt: "desc"
        },
        take: 7
      }
    }
  });

  let accountsProcessed = 0;
  let postSnapshotsCreated = 0;

  for (const account of accounts) {
    const adapter = getPlatformAdapter(account.platform as "threads");
    const now = new Date();
    const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const userMetrics = await adapter.getUserMetrics(account.id, since, now);

    await prisma.metricsSnapshot.create({
      data: {
        accountId: account.id,
        followerCount: userMetrics.followerCount,
        totalViews: userMetrics.views,
        totalLikes: userMetrics.likes,
        totalReplies: userMetrics.replies,
        totalReposts: userMetrics.reposts,
        totalQuotes: userMetrics.quotes
      }
    });

    accountsProcessed += 1;

    for (const post of account.posts) {
      if (!post.platformPostId) {
        continue;
      }

      const postMetrics = await adapter.getPostMetrics(account.id, post.platformPostId);

      await prisma.postMetrics.create({
        data: {
          postId: post.id,
          views: postMetrics.views,
          likes: postMetrics.likes,
          replies: postMetrics.replies,
          reposts: postMetrics.reposts,
          quotes: postMetrics.quotes,
          shares: postMetrics.shares
        }
      });

      postSnapshotsCreated += 1;
    }
  }

  return {
    accountsProcessed,
    postSnapshotsCreated
  };
}

export async function refreshExpiringTokens() {
  const threshold = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accounts = await prisma.platformAccount.findMany({
    where: {
      isActive: true,
      tokenExpiresAt: {
        lte: threshold
      }
    }
  });

  let refreshed = 0;
  let failed = 0;

  for (const account of accounts) {
    try {
      const adapter = getPlatformAdapter(account.platform as "threads");
      await adapter.refreshToken(account.id);
      refreshed += 1;
    } catch {
      failed += 1;
      await prisma.platformAccount.update({
        where: {
          id: account.id
        },
        data: {
          isActive: false
        }
      });
    }
  }

  return {
    refreshed,
    failed
  };
}
