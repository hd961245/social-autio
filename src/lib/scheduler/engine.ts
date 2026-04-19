export async function runScheduledPosts() {
  const { getPlatformAdapter } = await import("@/lib/platforms");
  const { logPublishEvent } = await import("@/lib/publish-log");
  const { prisma } = await import("@/lib/prisma");
  const { requestThreadsApproval } = await import("@/lib/threads-approval");

  const duePosts = await prisma.post.findMany({
    where: {
      status: {
        in: ["scheduled", "awaiting_approval"]
      },
      scheduledAt: {
        lte: new Date()
      },
      account: {
        platform: "threads"
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
      if (post.requiresApproval && post.approvalState !== "approved") {
        if (post.approvalState !== "requested") {
          await requestThreadsApproval(post.id);
        }

        continue;
      }

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

      await logPublishEvent({
        accountId: post.accountId,
        postId: post.id,
        actionType: "threads_scheduled_publish",
        status: "executed",
        detail: "排程 Threads 已成功送出"
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

      await logPublishEvent({
        accountId: post.accountId,
        postId: post.id,
        actionType: "threads_scheduled_failed",
        status: "failed",
        detail: error instanceof Error ? error.message : "Unknown scheduled publish failure"
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
