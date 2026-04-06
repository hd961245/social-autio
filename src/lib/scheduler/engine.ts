export async function runScheduledPosts() {
  const { getPlatformAdapter } = await import("@/lib/platforms");
  const { prisma } = await import("@/lib/prisma");

  const duePosts = await prisma.post.findMany({
    where: {
      status: "scheduled",
      scheduledAt: {
        lte: new Date()
      }
    },
    include: {
      account: true
    },
    orderBy: {
      scheduledAt: "asc"
    },
    take: 20
  });

  let published = 0;
  let failed = 0;

  for (const post of duePosts) {
    try {
      await prisma.post.update({
        where: { id: post.id },
        data: { status: "publishing" }
      });

      const adapter = getPlatformAdapter(post.account.platform as "threads" | "wordpress");
      const result = await adapter.createPost(post.accountId, {
        contentType: post.contentType as "text" | "image" | "video" | "carousel",
        title: post.title ?? undefined,
        text: post.textContent ?? undefined,
        html: post.htmlContent ?? undefined,
        excerpt: post.excerpt ?? undefined,
        mediaUrls: post.mediaUrls ? (JSON.parse(post.mediaUrls) as string[]) : undefined,
        featuredImageUrl: post.featuredImageUrl ?? undefined,
        categories: post.categories ? (JSON.parse(post.categories) as string[]) : undefined,
        tags: post.tags ? (JSON.parse(post.tags) as string[]) : undefined,
        replyToPostId: post.replyToPostId ?? undefined
      });

      await prisma.post.update({
        where: { id: post.id },
        data: {
          status: "published",
          publishedAt: new Date(),
          platformPostId: result.platformPostId,
          platformUrl: result.url ?? null
        }
      });

      if (post.sourceMatchId) {
        await prisma.keywordMatch.update({
          where: { id: post.sourceMatchId },
          data: {
            actionTaken: "replied",
            actionPostId: post.id
          }
        });

        await prisma.automationLog.updateMany({
          where: {
            postId: post.id,
            status: "scheduled"
          },
          data: {
            status: "executed",
            detail: `已發布至 ${post.account.platform}`
          }
        });
      }
      published += 1;
    } catch (error) {
      await prisma.post.update({
        where: { id: post.id },
        data: {
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Unknown scheduled publish failure"
        }
      });

      if (post.sourceMatchId) {
        await prisma.automationLog.updateMany({
          where: {
            postId: post.id,
            status: "scheduled"
          },
          data: {
            status: "failed",
            detail: error instanceof Error ? error.message : "Unknown scheduled publish failure"
          }
        });
      }
      failed += 1;
    }
  }

  return {
    processed: duePosts.length,
    published,
    failed
  };
}
