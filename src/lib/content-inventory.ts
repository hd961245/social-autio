import { prisma } from "@/lib/prisma";

export type InventoryStage = "source" | "draft" | "published" | "expandable" | "monetizable";

export type InventorySummaryCard = {
  label: string;
  value: string;
  detail: string;
};

export type InventoryItem = {
  id: string;
  stage: InventoryStage;
  title: string;
  detail: string;
  href: string;
  badge: string;
  badgeTone: "neutral" | "warm" | "success" | "dark";
  meta: string;
};

export type InventoryLane = {
  id: InventoryStage;
  label: string;
  description: string;
  items: InventoryItem[];
};

export type InventoryWorkflowStep = {
  label: string;
  detail: string;
};

export type InventoryView = {
  summaryCards: InventorySummaryCard[];
  workflow: InventoryWorkflowStep[];
  lanes: InventoryLane[];
  wordpressDraftMemory: Array<{
    id: string;
    title: string;
    siteLabel: string;
    href: string;
    backendHref: string | null;
    status: "fresh" | "extend" | "backend" | "stale";
    statusLabel: string;
    detail: string;
    updatedAt: string;
  }>;
};

function formatDate(value?: Date | null) {
  if (!value) {
    return "尚未記錄";
  }

  return value.toLocaleString("zh-TW", { hour12: false });
}

function getBadgeTone(stage: InventoryStage): InventoryItem["badgeTone"] {
  if (stage === "source") {
    return "neutral";
  }

  if (stage === "draft") {
    return "warm";
  }

  if (stage === "published") {
    return "dark";
  }

  if (stage === "expandable") {
    return "success";
  }

  return "warm";
}

export function getWordPressDraftStage(input: {
  updatedAt: Date;
  platformUrl?: string | null;
  replyToPostId?: string | null;
  excerpt?: string | null;
  title?: string | null;
  htmlContent?: string | null;
  textContent?: string | null;
}) {
  const ageInHours = (Date.now() - input.updatedAt.getTime()) / (1000 * 60 * 60);
  const bodyLength =
    (input.htmlContent ?? "").replace(/<[^>]+>/g, "").length +
    (input.textContent ?? "").length +
    (input.excerpt ?? "").length;

  if (input.platformUrl && bodyLength >= 420) {
    return {
      status: "backend" as const,
      statusLabel: "後台待細修",
      detail: "這篇已經進到 WordPress 草稿，而且內容骨架夠完整，適合直接進後台做最後調整。"
    };
  }

  if (input.replyToPostId || bodyLength < 260) {
    return {
      status: "extend" as const,
      statusLabel: "待補長文",
      detail: "這篇更像是從 Threads 或短稿延伸過來，下一步適合補案例、段落與 CTA。"
    };
  }

  if (ageInHours > 24 * 10) {
    return {
      status: "stale" as const,
      statusLabel: "積壓中",
      detail: "這篇已經放了一段時間，適合重新整理切角，避免只是堆著不發。"
    };
  }

  return {
    status: "fresh" as const,
    statusLabel: "新草稿",
    detail: "這篇剛整理好，最適合趁記憶還熱的時候補完前言、結論和商業模組。"
  };
}

export async function getContentInventory(): Promise<InventoryView> {
  try {
    const [sourceItems, settings, allPosts, draftPosts, publishedThreads] = await Promise.all([
      prisma.sourceWatch.findMany({
        where: { isActive: true, lastItemTitle: { not: null } },
        orderBy: [{ lastFetchedAt: "desc" }, { updatedAt: "desc" }]
      }),
      prisma.appSettings.findFirst(),
      prisma.post.findMany({
        include: {
          account: true,
          metrics: {
            orderBy: { capturedAt: "desc" },
            take: 1
          }
        },
        orderBy: { updatedAt: "desc" },
        take: 80
      }),
      prisma.post.findMany({
        where: {
          status: "draft",
          account: { platform: "wordpress" }
        },
        include: { account: true },
        orderBy: { updatedAt: "desc" },
        take: 10
      }),
      prisma.post.findMany({
        where: {
          status: "published",
          account: { platform: "threads" }
        },
        include: {
          account: true,
          metrics: {
            orderBy: { capturedAt: "desc" },
            take: 1
          }
        },
        orderBy: { publishedAt: "desc" },
        take: 24
      })
    ]);

    const syncedThreadIds = new Set(
      allPosts.filter((post) => post.account.platform === "wordpress" && post.replyToPostId).map((post) => post.replyToPostId as string)
    );
    const affiliateReady = Boolean(settings?.affiliateBlockPrimary || settings?.affiliateCta || settings?.affiliateDisclosure);

    const sourceLaneItems: InventoryItem[] = sourceItems
      .filter((item) => item.lastHandledStatus !== "imported")
      .slice(0, 6)
      .map((item) => ({
        id: item.id,
        stage: "source",
        title: item.lastItemTitle ?? item.label,
        detail: item.lastExcerpt ?? "這個來源已抓到新內容，適合先進 Inbox 判斷要不要改寫。",
        href: "/desk?tab=inbox",
        badge: item.sourceType.toUpperCase(),
        badgeTone: getBadgeTone("source"),
        meta: `${item.label} · ${formatDate(item.lastFetchedAt)}`
      }));

    const draftLaneItems: InventoryItem[] = allPosts
      .filter((post) => ["draft", "scheduled"].includes(post.status))
      .slice(0, 8)
      .map((post) => ({
        id: post.id,
        stage: "draft",
        title: post.title ?? post.textContent ?? "未命名草稿",
        detail:
          post.account.platform === "wordpress"
            ? "這篇在 WordPress 草稿線上，適合補段落、案例與 CTA。"
            : post.status === "scheduled"
              ? "這篇已進 Threads 排程，確認時間和 hook 後就能等送出。"
              : "這篇還在 Threads 草稿區，適合補強 hook 或結尾 CTA。",
        href: `/compose?postId=${post.id}`,
        badge: post.account.platform === "wordpress" ? "WP DRAFT" : post.status.toUpperCase(),
        badgeTone: getBadgeTone("draft"),
        meta: `@${post.account.platformUsername} · ${formatDate(post.updatedAt)}`
      }));

    const publishedLaneItems: InventoryItem[] = publishedThreads.slice(0, 6).map((post) => ({
      id: post.id,
      stage: "published",
      title: post.textContent ?? post.title ?? "未命名 Threads",
      detail: "這篇已經發布完成，現在重點是看是否值得再放大，或轉成長文素材。",
      href: `/posts/${post.id}`,
      badge: "LIVE",
      badgeTone: getBadgeTone("published"),
      meta: `@${post.account.platformUsername} · ${formatDate(post.publishedAt ?? post.createdAt)}`
    }));

    const expandablePosts = publishedThreads
      .filter((post) => {
        const latest = post.metrics[0];
        const views = latest?.views ?? 0;
        const engagement = views > 0 ? ((latest?.likes ?? 0) + (latest?.replies ?? 0) + (latest?.reposts ?? 0) + (latest?.quotes ?? 0) + (latest?.shares ?? 0)) / views : 0;
        return !syncedThreadIds.has(post.id) && (views >= 180 || engagement >= 0.06 || (latest?.replies ?? 0) + (latest?.quotes ?? 0) >= 4);
      })
      .slice(0, 6);

    const expandableLaneItems: InventoryItem[] = expandablePosts.map((post) => {
      const latest = post.metrics[0];
      const views = latest?.views ?? 0;
      const interactions = (latest?.likes ?? 0) + (latest?.replies ?? 0) + (latest?.reposts ?? 0) + (latest?.quotes ?? 0) + (latest?.shares ?? 0);
      return {
        id: post.id,
        stage: "expandable",
        title: post.textContent ?? post.title ?? "未命名 Threads",
        detail: "這篇互動或觀看已經起來了，下一步適合沉成 WordPress 草稿或系列文。",
        href: `/posts/${post.id}`,
        badge: "EXPAND",
        badgeTone: getBadgeTone("expandable"),
        meta: `${views} views · ${interactions} interactions`
      };
    });

    const wordpressDraftMemory = draftPosts.map((post) => {
      const memory = getWordPressDraftStage(post);
      return {
        id: post.id,
        title: post.title ?? post.textContent ?? "未命名草稿",
        siteLabel: post.account.platformUserId,
        href: `/compose?postId=${post.id}`,
        backendHref: post.platformUrl,
        status: memory.status,
        statusLabel: memory.statusLabel,
        detail: memory.detail,
        updatedAt: formatDate(post.updatedAt)
      };
    });

    const monetizableLaneItems: InventoryItem[] = draftPosts
      .filter((post) => {
        const bodyLength =
          (post.htmlContent ?? "").replace(/<[^>]+>/g, "").length +
          (post.textContent ?? "").length +
          (post.excerpt ?? "").length;
        return affiliateReady && bodyLength >= 320;
      })
      .slice(0, 6)
      .map((post) => ({
        id: post.id,
        stage: "monetizable",
        title: post.title ?? post.textContent ?? "未命名長文",
        detail: "這篇草稿已經接近可放推薦模組、Disclosure 和 CTA 的狀態，適合往商業版位收斂。",
        href: `/compose?postId=${post.id}`,
        badge: "MONETIZE",
        badgeTone: getBadgeTone("monetizable"),
        meta: `${post.account.platformUserId} · ${formatDate(post.updatedAt)}`
      }));

    const summaryCards: InventorySummaryCard[] = [
      {
        label: "來源待選",
        value: String(sourceLaneItems.length),
        detail: "還沒進改寫的來源項目"
      },
      {
        label: "草稿池",
        value: String(draftLaneItems.length),
        detail: "Threads + WordPress 仍在編修中的內容"
      },
      {
        label: "已發布",
        value: String(publishedLaneItems.length),
        detail: "最近可回頭檢查成效的 Threads"
      },
      {
        label: "可延伸",
        value: String(expandableLaneItems.length),
        detail: "適合沉成長文或系列內容的 Threads"
      },
      {
        label: "可變現",
        value: String(monetizableLaneItems.length),
        detail: affiliateReady ? "已接近可以放 CTA / 聯盟模組" : "先補 Affiliate Library 才能往這一步推"
      }
    ];

    const workflow: InventoryWorkflowStep[] = [
      { label: "1. 收來源", detail: "先看今天抓到的新來源，不要直接從空白開始。" },
      { label: "2. 進草稿", detail: "把值得做的題目轉成 Threads 或 WordPress 草稿。" },
      { label: "3. 看表現", detail: "已發布 Threads 不是終點，表現好的要再收回內容池。" },
      { label: "4. 沉長文", detail: "高互動短文要盡快沉成可編輯的 WordPress 草稿。" },
      { label: "5. 接商業", detail: "當草稿成熟後，再放推薦模組、Disclosure 和 CTA。" }
    ];

    return {
      summaryCards,
      workflow,
      lanes: [
        { id: "source", label: "Source Backlog", description: "先挑今天值得進桌面的來源。", items: sourceLaneItems },
        { id: "draft", label: "Draft Bench", description: "正在寫、正在排、正在補的稿件。", items: draftLaneItems },
        { id: "published", label: "Published Loop", description: "已發布但值得回頭看的 Threads。", items: publishedLaneItems },
        { id: "expandable", label: "Expansion Queue", description: "值得沉成長文或延伸系列的內容。", items: expandableLaneItems },
        { id: "monetizable", label: "Revenue-Ready", description: "已接近可放聯盟模組與 CTA 的長文。", items: monetizableLaneItems }
      ],
      wordpressDraftMemory
    };
  } catch {
    return {
      summaryCards: [
        { label: "來源待選", value: "0", detail: "尚未讀到來源資料" },
        { label: "草稿池", value: "0", detail: "尚未讀到草稿資料" },
        { label: "已發布", value: "0", detail: "尚未讀到 Threads 發布資料" },
        { label: "可延伸", value: "0", detail: "尚未讀到可延伸內容" },
        { label: "可變現", value: "0", detail: "尚未讀到可變現草稿" }
      ],
      workflow: [],
      lanes: [
        { id: "source", label: "Source Backlog", description: "尚未讀到來源資料。", items: [] },
        { id: "draft", label: "Draft Bench", description: "尚未讀到草稿資料。", items: [] },
        { id: "published", label: "Published Loop", description: "尚未讀到發布資料。", items: [] },
        { id: "expandable", label: "Expansion Queue", description: "尚未讀到延伸資料。", items: [] },
        { id: "monetizable", label: "Revenue-Ready", description: "尚未讀到商業化資料。", items: [] }
      ],
      wordpressDraftMemory: []
    };
  }
}
