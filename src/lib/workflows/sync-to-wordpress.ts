import { prisma } from "@/lib/prisma";

function extractTags(text: string) {
  const matches = [...text.matchAll(/#([\p{L}\p{N}_-]+)/gu)];
  return [...new Set(matches.map((match) => match[1]).filter(Boolean))].slice(0, 5);
}

function paragraphize(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${line}</p>`)
    .join("\n");
}

function buildWordPressDraft(threadText: string, postUrl?: string | null) {
  const cleaned = threadText.trim();
  const title = cleaned.split("\n").find(Boolean)?.replace(/^#+\s*/, "").slice(0, 80) || "Threads 延伸文章";
  const tags = extractTags(cleaned);
  const htmlParts = [
    "<p>這篇內容由 Threads 貼文延伸整理，方便後續補充長文版本。</p>",
    paragraphize(cleaned),
    "<h2>可延伸段落</h2>",
    "<ul><li>補充背景脈絡</li><li>加入案例或數據</li><li>整理 CTA 或結論</li></ul>"
  ];

  if (postUrl) {
    htmlParts.push(`<p>原始 Threads 貼文：<a href="${postUrl}">${postUrl}</a></p>`);
  }

  return {
    title,
    excerpt: cleaned.slice(0, 140),
    html: htmlParts.join("\n"),
    tags
  };
}

export async function syncPostToWordPress(postId: string) {
  const sourcePost = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      account: true
    }
  });

  if (!sourcePost) {
    throw new Error("找不到指定貼文。");
  }

  if (sourcePost.account.platform !== "threads") {
    throw new Error("目前只支援將 Threads 貼文同步到 WordPress。");
  }

  if (sourcePost.status !== "published") {
    throw new Error("請先讓 Threads 貼文成功發布後，再同步到 WordPress。");
  }

  const wordpressAccount = await prisma.platformAccount.findFirst({
    where: {
      platform: "wordpress",
      isActive: true,
      userId: sourcePost.userId
    },
    orderBy: [{ lastSyncedAt: "desc" }, { createdAt: "desc" }]
  });

  if (!wordpressAccount) {
    throw new Error("還沒有可用的 WordPress 站台，請先到 WordPress 頁完成連接。");
  }

  const existing = await prisma.post.findFirst({
    where: {
      accountId: wordpressAccount.id,
      replyToPostId: sourcePost.platformPostId,
      title: {
        startsWith: "[Sync]"
      }
    }
  });

  if (existing) {
    return {
      postId: existing.id,
      scheduled: existing.status === "scheduled",
      duplicated: true
    };
  }

  const text = sourcePost.textContent?.trim();

  if (!text) {
    throw new Error("這篇 Threads 貼文沒有可同步的文字內容。");
  }

  const draft = buildWordPressDraft(text, sourcePost.platformUrl);

  const created = await prisma.post.create({
    data: {
      userId: sourcePost.userId,
      accountId: wordpressAccount.id,
      contentType: "text",
      title: `[Sync] ${draft.title}`,
      textContent: draft.excerpt,
      htmlContent: draft.html,
      excerpt: draft.excerpt,
      tags: draft.tags.length ? JSON.stringify(draft.tags) : null,
      status: "scheduled",
      scheduledAt: new Date(),
      replyToPostId: sourcePost.platformPostId,
      mediaUrls: sourcePost.mediaUrls,
      featuredImageUrl: sourcePost.mediaUrls ? (JSON.parse(sourcePost.mediaUrls) as string[])[0] ?? null : null
    }
  });

  await prisma.automationLog.create({
    data: {
      accountId: wordpressAccount.id,
      postId: created.id,
      actionType: "wordpress_sync",
      status: "scheduled",
      detail: `已由 Threads 貼文建立 WordPress 草稿佇列`
    }
  });

  return {
    postId: created.id,
    scheduled: true,
    duplicated: false
  };
}
