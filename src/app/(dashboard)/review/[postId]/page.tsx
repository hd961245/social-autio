import { notFound } from "next/navigation";
import { PageIntro } from "@/components/dashboard/page-intro";
import { ReviewWorkspace } from "@/components/dashboard/review-workspace";
import { buildOperatingBrief } from "@/lib/dashboard-data";
import { summarizeMissionStrategy } from "@/lib/mission-scoring";
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

  const [post, ingestion, accounts, settings] = await Promise.all([
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
    }),
    prisma.appSettings.findFirst()
  ]);

  if (!post || post.account.platform !== "threads") {
    notFound();
  }

  const missionContext = {
    title: settings?.missionTitle,
    goal: settings?.editorialGoal,
    direction: settings?.editorialDirection,
    unit: settings?.missionUnit,
    currentValue: settings?.missionCurrentValue,
    targetValue: settings?.missionTargetValue
  };
  const candidateRationale = extractCandidateRationale(ingestion?.notes) ?? post.excerpt;
  const brief = buildOperatingBrief({
    title: post.title,
    text: post.textContent,
    topicTag: post.topicTag,
    candidateRationale,
    personaLabel: post.account.personaLabel,
    mission: missionContext
  });
  const missionStrategy = summarizeMissionStrategy(missionContext);

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Review"
        title="先進確認區，再交給 AI 生成可發版"
        description="這裡是候選稿的 assignment 工作台。先看來源、先決定目的，再讓 AI 幫你出一版真正要送進 Compose 的 Threads 草稿。"
      />

      <section className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <article className="glass-panel rounded-[1.8rem] border border-[var(--border)] p-5">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">AI Brief</p>
          <h2 className="mt-2 text-2xl font-semibold">這篇不是直接發，而是先跑一輪小實驗</h2>
          <div className="mt-5 space-y-3 text-sm leading-7">
            <div className="rounded-[1.15rem] border border-[var(--border)] bg-white/82 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Lane</p>
              <p className="mt-2 font-medium">{brief.lane}</p>
            </div>
            <div className="rounded-[1.15rem] border border-[var(--border)] bg-white/82 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Why Now</p>
              <p className="mt-2 text-[var(--foreground)]">{brief.whyNow}</p>
            </div>
            <div className="rounded-[1.15rem] border border-[var(--border)] bg-white/82 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Assignment</p>
              <p className="mt-2 text-[var(--foreground)]">{brief.assignment}</p>
            </div>
            <div className="rounded-[1.15rem] border border-[var(--border)] bg-white/82 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Success Signal</p>
              <p className="mt-2 text-[var(--foreground)]">{brief.successMetric}</p>
            </div>
            <div className="rounded-[1.15rem] border border-[var(--border)] bg-white/82 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">If It Works</p>
              <p className="mt-2 text-[var(--foreground)]">{brief.nextStep}</p>
            </div>
          </div>
        </article>

        <article className="glass-panel rounded-[1.8rem] border border-[var(--border)] p-5">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">Mission Context</p>
          <h2 className="mt-2 text-2xl font-semibold">系統現在的判法</h2>
          <div className="mt-5 space-y-3 text-sm leading-7">
            <div className="rounded-[1.15rem] border border-[var(--border)] bg-white/82 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Primary Focus</p>
              <p className="mt-2">{missionStrategy.primaryFocus}</p>
            </div>
            <div className="rounded-[1.15rem] border border-[var(--border)] bg-white/82 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Threads Bias</p>
              <p className="mt-2">{missionStrategy.threadBias}</p>
            </div>
            <div className="rounded-[1.15rem] border border-[var(--border)] bg-white/82 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">WordPress / Optimization</p>
              <p className="mt-2">
                {missionStrategy.wordpressBias} {missionStrategy.optimizationBias}
              </p>
            </div>
          </div>
        </article>
      </section>

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
        candidateRationale={candidateRationale}
        accounts={accounts.map((account) => ({
          id: account.id,
          username: `@${account.platformUsername}`,
          personaLabel: account.personaLabel ?? undefined
        }))}
      />
    </div>
  );
}
