import { logPublishEvent } from "@/lib/publish-log";
import { getPlatformAdapter } from "@/lib/platforms";
import { prisma } from "@/lib/prisma";

export async function publishExistingThreadsPost(postId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      account: true
    }
  });

  if (!post) {
    throw new Error("找不到指定貼文。");
  }

  if (post.account.platform !== "threads") {
    throw new Error("目前只支援直接發布 Threads 草稿。");
  }

  if (post.status === "published") {
    return {
      postId: post.id,
      status: "published" as const,
      platformUrl: post.platformUrl
    };
  }

  await prisma.post.update({
    where: { id: post.id },
    data: {
      status: "publishing",
      errorMessage: null,
      requiresApproval: false,
      approvalState: null,
      approvalToken: null,
      approvalRequestedAt: null,
      approvalDecisionAt: new Date()
    }
  });

  try {
    const adapter = getPlatformAdapter("threads");
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

    const updated = await prisma.post.update({
      where: { id: post.id },
      data: {
        status: "published",
        publishedAt: new Date(),
        platformPostId: result.platformPostId,
        platformUrl: result.url ?? null,
        errorMessage: null
      }
    });

    await logPublishEvent({
      accountId: post.accountId,
      postId: post.id,
      actionType: "threads_publish",
      status: "executed",
      detail: "已由總表直接發布到 Threads"
    });

    return {
      postId: updated.id,
      status: "published" as const,
      platformUrl: updated.platformUrl
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown publish error";

    await prisma.post.update({
      where: { id: post.id },
      data: {
        status: "failed",
        errorMessage: message
      }
    });

    await logPublishEvent({
      accountId: post.accountId,
      postId: post.id,
      actionType: "threads_publish_failed",
      status: "failed",
      detail: message
    });

    throw error;
  }
}
