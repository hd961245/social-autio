import { DatabaseBanner } from "@/components/dashboard/database-banner";
import { PageIntro } from "@/components/dashboard/page-intro";
import { PostComposerForm } from "@/components/dashboard/post-composer-form";
import { getDatabaseStatus, getThreadPostDeepDive } from "@/lib/dashboard-data";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ComposePage({
  searchParams
}: {
  searchParams?: Promise<{ postId?: string; reviewId?: string }>;
}) {
  const databaseStatus = await getDatabaseStatus();
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
    const params = await searchParams;
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
          scheduledAt: post.scheduledAt ? new Date(post.scheduledAt).toISOString().slice(0, 16) : ""
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

  const preferredAccountId =
    draftPost?.accountId ?? orderedAccounts.find((account) => account.platform === "threads")?.id ?? orderedAccounts[0]?.id ?? "";

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Compose"
        title={draftPost ? "編輯現有草稿" : "建立新的 Threads 內容"}
        description={
          draftPost
            ? "這裡會直接載入你剛才的草稿。Threads 可繼續排程或送出；WordPress 只會同步成草稿，不直接發布。"
            : "Threads 繼續負責即時發文、排程與回覆；WordPress 只保留成長文草稿台，方便先改完再進站台細修。"
        }
      />
      <DatabaseBanner status={databaseStatus} />
      <PostComposerForm
        accounts={orderedAccounts.map((account) => ({
          id: account.id,
          username: `@${account.platformUsername}`,
          platform: account.platform
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
        initialDraft={draftPost}
        reviewContext={reviewContext}
        preferredAccountId={preferredAccountId}
      />
    </div>
  );
}
