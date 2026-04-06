import { DatabaseBanner } from "@/components/dashboard/database-banner";
import { PageIntro } from "@/components/dashboard/page-intro";
import { PostComposerForm } from "@/components/dashboard/post-composer-form";
import { getDatabaseStatus } from "@/lib/dashboard-data";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ComposePage() {
  const databaseStatus = await getDatabaseStatus();
  let accounts: Awaited<ReturnType<typeof prisma.platformAccount.findMany>> = [];
  let posts: Awaited<
    ReturnType<
      typeof prisma.post.findMany<{
        include: { account: true };
        orderBy: { createdAt: "desc" };
        take: 5;
      }>
    >
  > = [];

  if (databaseStatus.ready) {
    [accounts, posts] = await Promise.all([
      prisma.platformAccount.findMany({
        where: { isActive: true },
        orderBy: { createdAt: "desc" }
      }),
      prisma.post.findMany({
        include: { account: true },
        orderBy: { createdAt: "desc" },
        take: 5
      })
    ]);
  }

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Compose"
        title="建立新的平台內容"
        description="現在可以選 Threads 或 WordPress。Threads 支援立即發文與排程；WordPress 第一版支援直接發文章。"
      />
      <DatabaseBanner status={databaseStatus} />
      <PostComposerForm
        accounts={accounts.map((account) => ({
          id: account.id,
          username: `@${account.platformUsername}`,
          platform: account.platform
        }))}
        recentPosts={posts.map((post) => ({
          id: post.id,
          status: post.status,
          text: post.textContent ?? "(無文字內容)",
          account: `@${post.account.platformUsername}`
        }))}
      />
    </div>
  );
}
