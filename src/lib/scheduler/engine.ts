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
        text: post.textContent ?? undefined,
        mediaUrls: post.mediaUrls ? (JSON.parse(post.mediaUrls) as string[]) : undefined
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
      published += 1;
    } catch (error) {
      await prisma.post.update({
        where: { id: post.id },
        data: {
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Unknown scheduled publish failure"
        }
      });
      failed += 1;
    }
  }

  return {
    processed: duePosts.length,
    published,
    failed
  };
}
