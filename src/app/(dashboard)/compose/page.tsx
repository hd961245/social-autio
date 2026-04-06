import { PageIntro } from "@/components/dashboard/page-intro";
import { PostComposerForm } from "@/components/dashboard/post-composer-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ComposePage() {
  const [accounts, posts] = await Promise.all([
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

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Compose"
        title="建立新的 Threads 貼文"
        description="第一版先支援文字與單一媒體立即發文。送出後會寫入資料庫並直接走 Threads publish 流程。"
      />
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
