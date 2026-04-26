import { DatabaseBanner } from "@/components/dashboard/database-banner";
import { HelpSheet } from "@/components/dashboard/help-sheet";
import { PageIntro } from "@/components/dashboard/page-intro";
import { PostComposerForm } from "@/components/dashboard/post-composer-form";
import { getComposeHealth, getDatabaseStatus, getPublishOutcomeLogs, getThreadPostDeepDive } from "@/lib/dashboard-data";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ComposePage({
  searchParams
}: {
  searchParams?: Promise<{ postId?: string; reviewId?: string; seedPostId?: string; accountId?: string }>;
}) {
  const databaseStatus = await getDatabaseStatus();
  const composeHealth = await getComposeHealth().catch(() => ({
    threadsReady: false,
    threadsMessage: "目前無法讀取 Threads 狀態",
    tokenStatus: "missing" as const,
    tokenMessage: "尚未讀到 token 狀態",
    queueCount: 0,
    queueMessage: "尚未讀到排程資料",
    aiReady: false,
    aiMessage: "尚未讀到 AI 設定"
  }));
  const publishLogs = await getPublishOutcomeLogs().catch(() => []);
  const params = await searchParams;
  let accounts: Awaited<ReturnType<typeof prisma.platformAccount.findMany>> = [];
  let settings: Awaited<ReturnType<typeof prisma.appSettings.findFirst>> = null;
  let posts: Awaited<
    ReturnType<
      typeof prisma.post.findMany<{
        include: { account: true };
        orderBy: { createdAt: "desc" };
        take: 5;
      }>
    >
  > = [];
  let draftPost:
    | {
        id: string;
        accountId: string;
        platform: string;
        title: string;
        text: string;
        html: string;
        excerpt: string;
        mediaUrl: string;
        featuredImageUrl: string;
        categories: string;
        tags: string;
        status: string;
        scheduledAt: string;
        requiresApproval?: boolean;
      }
    | null = null;
  let reviewContext:
    | {
        sourcePostId: string;
        account: string;
        nextAction: string;
        momentumLabel: string;
        insights: string[];
      }
    | null = null;

  if (databaseStatus.ready) {
    try {
      [accounts, posts, settings] = await Promise.all([
        prisma.platformAccount.findMany({
          where: { isActive: true },
          orderBy: { createdAt: "desc" }
        }),
        prisma.post.findMany({
          include: { account: true },
          orderBy: { createdAt: "desc" },
          take: 5
        }),
        prisma.appSettings.findFirst()
      ]);

      if (params?.postId) {
        const post = await prisma.post.findUnique({
          where: { id: params.postId },
          include: { account: true }
        });

        if (post) {
          draftPost = {
            id: post.id,
            accountId: post.accountId,
            platform: post.account.platform,
            title: post.title ?? "",
            text: post.textContent ?? "",
            html: post.htmlContent ?? "",
            excerpt: post.excerpt ?? "",
            mediaUrl: post.mediaUrls ? ((JSON.parse(post.mediaUrls) as string[])[0] ?? "") : "",
            featuredImageUrl: post.featuredImageUrl ?? "",
            categories: post.categories ? (JSON.parse(post.categories) as string[]).join(", ") : "",
            tags: post.tags ? (JSON.parse(post.tags) as string[]).join(", ") : "",
            status: post.status,
            scheduledAt: post.scheduledAt ? new Date(post.scheduledAt).toISOString().slice(0, 16) : "",
            requiresApproval: post.requiresApproval
          };
        }
      }

      if (params?.seedPostId && !draftPost) {
        const seedPost = await prisma.post.findUnique({
          where: { id: params.seedPostId },
          include: { account: true }
        });

        if (seedPost) {
          draftPost = {
            id: "",
            accountId: seedPost.account.platform === "threads" ? seedPost.accountId : "",
            platform: seedPost.account.platform,
            title: seedPost.title ?? "",
            text: seedPost.textContent ?? "",
            html: seedPost.htmlContent ?? "",
            excerpt: seedPost.excerpt ?? "",
            mediaUrl: seedPost.mediaUrls ? ((JSON.parse(seedPost.mediaUrls) as string[])[0] ?? "") : "",
            featuredImageUrl: seedPost.featuredImageUrl ?? "",
            categories: seedPost.categories ? (JSON.parse(seedPost.categories) as string[]).join(", ") : "",
            tags: seedPost.tags ? (JSON.parse(seedPost.tags) as string[]).join(", ") : "",
            status: "draft",
            scheduledAt: "",
            requiresApproval: false
          };
        }
      }

      const reviewId = params?.reviewId ?? params?.postId;
      if (reviewId) {
        const reviewPost = await getThreadPostDeepDive(reviewId);

        if (reviewPost) {
          reviewContext = {
            sourcePostId: reviewPost.id,
            account: reviewPost.account,
            nextAction: reviewPost.nextAction,
            momentumLabel: reviewPost.health.momentumLabel,
            insights: reviewPost.insights
          };
        }
      }
    } catch {
      accounts = [];
      posts = [];
      settings = null;
      draftPost = null;
      reviewContext = null;
    }
  }

  const orderedAccounts = [...accounts].sort((a, b) => {
    if (draftPost) {
      if (a.id === draftPost.accountId) return -1;
      if (b.id === draftPost.accountId) return 1;
    }

    if (a.platform === "threads" && b.platform !== "threads") return -1;
    if (a.platform !== "threads" && b.platform === "threads") return 1;
    return 0;
  });

  const requestedAccountId = databaseStatus.ready ? params?.accountId ?? "" : "";
  const preferredAccountId =
    draftPost?.accountId ??
    (requestedAccountId && orderedAccounts.some((account) => account.id === requestedAccountId) ? requestedAccountId : "") ??
    orderedAccounts.find((account) => account.platform === "threads")?.id ??
    orderedAccounts[0]?.id ??
    "";

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Compose"
        title={draftPost ? "編輯現有草稿" : "建立新的 Threads 內容"}
        description={
          draftPost
            ? "這裡會直接載入你剛才的草稿。AI 起稿、微調、排程與送出都在同一頁完成。"
            : "把 AI 起稿、手動改稿、排程與發佈收在同一條工作流裡。Threads 負責發布；WordPress 保留成草稿台。"
        }
        action={
          <div className="flex flex-wrap gap-3">
            <HelpSheet topic="compose" buttonLabel="查看這頁說明" />
            <a href="/help?topic=ai-workflow" className="rounded-full border border-[var(--border)] bg-white/80 px-4 py-2 text-sm">
              打開 AI 工作流
            </a>
          </div>
        }
      />
      <DatabaseBanner status={databaseStatus} />
      <section className="grid gap-4 md:grid-cols-4">
        <article className="metric-card">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Threads Ready</p>
          <p className="mt-3 text-2xl font-semibold">{composeHealth.threadsReady ? "Ready" : "Blocked"}</p>
          <p className="mt-2 text-sm text-[var(--muted)]">{composeHealth.threadsMessage}</p>
        </article>
        <article className="metric-card">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Token Health</p>
          <p className="mt-3 text-2xl font-semibold">
            {composeHealth.tokenStatus === "healthy" ? "Healthy" : composeHealth.tokenStatus === "expiring" ? "Expiring" : "Missing"}
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">{composeHealth.tokenMessage}</p>
        </article>
        <article className="metric-card">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Scheduled Queue</p>
          <p className="mt-3 text-2xl font-semibold">{composeHealth.queueCount}</p>
          <p className="mt-2 text-sm text-[var(--muted)]">{composeHealth.queueMessage}</p>
        </article>
        <article className="metric-card">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">AI Writing</p>
          <p className="mt-3 text-2xl font-semibold">{composeHealth.aiReady ? "Ready" : "Blocked"}</p>
          <p className="mt-2 text-sm text-[var(--muted)]">{composeHealth.aiMessage}</p>
        </article>
      </section>
      <PostComposerForm
        accounts={orderedAccounts.map((account) => ({
          id: account.id,
          username: `@${account.platformUsername}`,
          platform: account.platform,
          personaLabel: account.personaLabel ?? "",
          personaPrompt: account.personaPrompt ?? "",
          defaultTone: account.defaultTone ?? "",
          topicFocus: account.topicFocus ?? "",
          hookStyle: account.hookStyle ?? "",
          ctaStyle: account.ctaStyle ?? "",
          voiceGuardrails: account.voiceGuardrails ?? ""
        }))}
        recentPosts={posts.map((post) => ({
          id: post.id,
          status: post.status,
          text: post.title ?? post.textContent ?? "(無文字內容)",
          account: `@${post.account.platformUsername}`,
          platform: post.account.platform
        }))}
        affiliateLibrary={{
          primary: settings?.affiliateBlockPrimary ?? "",
          secondary: settings?.affiliateBlockSecondary ?? "",
          disclosure: settings?.affiliateDisclosure ?? "",
          cta: settings?.affiliateCta ?? ""
        }}
        initialDraft={draftPost?.id ? draftPost : null}
        initialSeed={!draftPost?.id && draftPost ? draftPost : null}
        reviewContext={reviewContext}
        preferredAccountId={preferredAccountId}
        publishLogs={publishLogs}
        initialAiProvider={(settings?.aiProvider as "auto" | "gemini" | "claude" | "openai" | undefined) ?? "auto"}
      />
    </div>
  );
}
