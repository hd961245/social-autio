import { prisma } from "@/lib/prisma";
import { buildTemplateHtml } from "@/lib/content/wordpress-templates";

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

function buildSummary(cleaned: string) {
  const firstParagraphs = cleaned
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3);

  return firstParagraphs.join(" ").slice(0, 180);
}

function buildOutlineHeadings(title: string, cleaned: string) {
  const shortTitle = title.replace(/^#+\s*/, "").trim();
  const signal =
    cleaned
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .find((line) => line.length >= 18)
      ?.slice(0, 42) || shortTitle;

  return [
    "這個題目為什麼現在值得看",
    "事件脈絡與關鍵數字",
    `我怎麼解讀「${signal}」`,
    "對讀者真正有用的下一步"
  ];
}

function buildWordPressDraft(
  threadText: string,
  options: {
    postUrl?: string | null;
    personaPrompt?: string;
    titleOverride?: string;
    affiliatePolicy?: string;
    affiliateLibrary?: {
      primary: string;
      secondary: string;
      disclosure: string;
      cta: string;
    };
  }
) {
  const cleaned = threadText.trim();
  const title =
    options.titleOverride?.trim().slice(0, 80) ||
    cleaned.split("\n").find(Boolean)?.replace(/^#+\s*/, "").slice(0, 80) ||
    "Threads 延伸文章";
  const tags = extractTags(cleaned);
  const summary = buildSummary(cleaned);
  const outlineHeadings = buildOutlineHeadings(title, cleaned);
  const paragraphs = cleaned
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 6);
  const points = [
    "補充背景脈絡，說清楚這個主題為什麼現在值得寫",
    "加入案例、數字或實際經驗，讓 Threads 的觀點變成可讀的長文",
    "在結尾補 CTA、延伸閱讀或推薦資源"
  ];

  const htmlParts = [
    "<p>這篇草稿是從一則已發布的 Threads 延伸進來，目標不是備份原文，而是把原本短貼的觀點整理成可繼續寫的長文底稿。</p>",
    options.postUrl ? `<p>原始 Threads 貼文：<a href="${options.postUrl}">${options.postUrl}</a></p>` : "",
    `<section><h2>文章摘要</h2><p>${summary}</p></section>`,
    `<section><h2>建議段落架構</h2><ol>${outlineHeadings.map((heading) => `<li>${heading}</li>`).join("")}</ol></section>`,
    buildTemplateHtml({
      templateId: "opinion",
      title,
      summary,
      paragraphs,
      points,
      affiliatePolicy: options.affiliatePolicy || "",
      personaPrompt: options.personaPrompt || "",
      affiliateLibrary: options.affiliateLibrary
    }),
    "<h2>可延伸段落</h2>",
    "<ul><li>補一段更完整的背景與情境</li><li>加入你自己的案例、反例或操作細節</li><li>最後收成明確 CTA 或推薦資源</li></ul>",
    `<blockquote><strong>原始 Threads 內容</strong>${paragraphize(cleaned)}</blockquote>`
  ].filter(Boolean);

  return {
    title,
    excerpt: summary.slice(0, 140),
    html: htmlParts.join("\n"),
    tags
  };
}

export async function syncPostToWordPress(postId: string, options?: { titleOverride?: string }) {
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

  const [wordpressAccount, settings] = await Promise.all([
    prisma.platformAccount.findFirst({
      where: {
        platform: "wordpress",
        isActive: true,
        userId: sourcePost.userId
      },
      orderBy: [{ lastSyncedAt: "desc" }, { createdAt: "desc" }]
    }),
    prisma.appSettings.findFirst()
  ]);

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

  const personaPrompt = [
    settings?.globalPersonaPrompt?.trim() || "用冷靜、有觀點、像內容策略師一樣的語氣，幫我把短內容整理成可寫長文的底稿。",
    settings?.writingStyleProfile?.trim() ? `寫作風格基底：${settings.writingStyleProfile.trim()}` : ""
  ]
    .filter(Boolean)
    .join("\n\n");

  const draft = buildWordPressDraft(text, {
    postUrl: sourcePost.platformUrl,
    personaPrompt,
    titleOverride: options?.titleOverride,
    affiliatePolicy: settings?.affiliateLinkPolicy?.trim() || "",
    affiliateLibrary: {
      primary: settings?.affiliateBlockPrimary?.trim() || "",
      secondary: settings?.affiliateBlockSecondary?.trim() || "",
      disclosure: settings?.affiliateDisclosure?.trim() || "",
      cta: settings?.affiliateCta?.trim() || ""
    }
  });

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
      status: "draft",
      scheduledAt: null,
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
      status: "executed",
      detail: "已由 Threads 貼文建立 WordPress 可編輯草稿"
    }
  });

  return {
    postId: created.id,
    scheduled: false,
    duplicated: false
  };
}
