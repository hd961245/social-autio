import { notFound } from "next/navigation";
import { PageIntro } from "@/components/dashboard/page-intro";
import { ReviewWorkspace } from "@/components/dashboard/review-workspace";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function extractCandidateRationale(notes?: string | null) {
  if (!notes) {
    return null;
  }

  const match = notes.match(/\|\s*Candidate:\s*(.+)$/);
  return match?.[1]?.trim() || null;
}

export default async function ReviewPage({
  params
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;

  const [post, ingestion, accounts] = await Promise.all([
    prisma.post.findUnique({
      where: { id: postId },
      include: { account: true }
    }),
    prisma.ingestionRecord.findFirst({
      where: {
        generatedPostIds: {
          contains: postId
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    }),
    prisma.platformAccount.findMany({
      where: {
        isActive: true,
        platform: "threads"
      },
      orderBy: [{ isActive: "desc" }, { createdAt: "asc" }]
    })
  ]);

  if (!post || post.account.platform !== "threads") {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Review"
        title="先進確認區，再交給 AI 生成可發版"
        description="這裡是候選稿的 assignment 工作台。先看來源、先決定目的，再讓 AI 幫你出一版真正要送進 Compose 的 Threads 草稿。"
      />

      <ReviewWorkspace
        post={{
          id: post.id,
          title: post.title ?? "未命名候選稿",
          text: post.textContent ?? "",
          excerpt: post.excerpt ?? "",
          personaLabel: post.account.personaLabel ?? undefined,
          accountId: post.accountId,
          accountLabel: `@${post.account.platformUsername}`
        }}
        sourceUrl={ingestion?.sourceUrl ?? post.platformUrl}
        candidateRationale={extractCandidateRationale(ingestion?.notes) ?? post.excerpt}
        accounts={accounts.map((account) => ({
          id: account.id,
          username: `@${account.platformUsername}`,
          personaLabel: account.personaLabel ?? undefined
        }))}
      />
    </div>
  );
}
