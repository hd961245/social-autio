import Link from "next/link";
import { notFound } from "next/navigation";

import { PageIntro } from "@/components/dashboard/page-intro";
import {
  getAccountOperatingSummaries,
  getPostSummaries,
  getWordPressExpansionCandidates
} from "@/lib/dashboard-data";
import {
  classifySourceKnowledgeLane,
  routeSourceToPersona,
  scoreSourceItem
} from "@/lib/content/source-inbox";
import { getGscOpportunityQueue } from "@/lib/gsc";
import { summarizeMissionStrategy } from "@/lib/mission-scoring";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function getTodayKey(value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(value);
}

function toDayKey(value?: Date | null) {
  if (!value) {
    return null;
  }

  return getTodayKey(value);
}

export default async function AccountOperatingPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [account, settings, accountSummaries, posts, expansionCandidates, gscOpportunities, sourceItems, recentLogs, wordpressPosts] =
    await Promise.all([
      prisma.platformAccount.findUnique({
        where: { id },
        include: {
          metricsSnapshots: {
            orderBy: { capturedAt: "desc" },
            take: 1
          },
          posts: {
            orderBy: { createdAt: "desc" },
            take: 30,
            include: {
              metrics: {
                orderBy: { capturedAt: "desc" },
                take: 1
              }
            }
          }
        }
      }),
      prisma.appSettings.findFirst(),
      getAccountOperatingSummaries(),
      getPostSummaries(),
      getWordPressExpansionCandidates(),
      getGscOpportunityQueue().catch(() => ({
        configured: false,
        items: [],
        message: "目前還讀不到 Search Console 機會隊列。"
      })),
      prisma.sourceWatch.findMany({
        where: { isActive: true },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        take: 18
      }),
      prisma.automationLog.findMany({
        where: {
          accountId: id
        },
        orderBy: {
          executedAt: "desc"
        },
        take: 12
      }),
      prisma.post.findMany({
        where: {
          account: {
            platform: "wordpress"
          }
        },
        include: {
          account: true
        },
        orderBy: {
          updatedAt: "desc"
        },
        take: 24
      })
    ]);

  if (!account || account.platform !== "threads") {
    notFound();
  }

  const summary = accountSummaries.find((item) => item.id === id);
  if (!summary) {
    notFound();
  }

  const missionStrategy = summarizeMissionStrategy({
    title: settings?.missionTitle,
    goal: settings?.editorialGoal,
    direction: settings?.editorialDirection,
    unit: settings?.missionUnit,
    currentValue: settings?.missionCurrentValue,
    targetValue: settings?.missionTargetValue
  });
  const todayKey = getTodayKey();
  const accountDrafts = posts.filter((post) => post.accountId === id && post.platform === "threads" && post.status === "draft");
  const scheduledPosts = account.posts.filter((post) => post.status === "scheduled");
  const publishedToday = account.posts.filter(
    (post) => post.status === "published" && toDayKey(post.publishedAt ?? post.createdAt) === todayKey
  );
  const reviewDrafts = accountDrafts.filter((post) => post.reviewLane !== "direct");
  const directDrafts = accountDrafts.filter((post) => post.reviewLane === "direct");
  const optimizationDrafts = account.posts.filter((post) => post.topicTag?.startsWith("optimize:"));
  const accountExpansionCandidates = expansionCandidates.filter((item) => item.account === summary.username);
  const threadPlatformPostIds = new Set(
    account.posts.map((post) => post.platformPostId).filter(Boolean) as string[]
  );
  const relatedWordPressPosts = wordpressPosts.filter((post) => post.replyToPostId && threadPlatformPostIds.has(post.replyToPostId));
  const exceptionLogs = recentLogs.filter((log) => log.status === "failed");

  const routedSources = sourceItems
    .map((item) => {
      const routedPersona = routeSourceToPersona({
        title: item.lastItemTitle ?? "",
        excerpt: item.lastExcerpt ?? "",
        accounts: [
          {
            id: account.id,
            username: `@${account.platformUsername}`,
            personaLabel: account.personaLabel ?? "",
            personaPrompt: account.personaPrompt ?? "",
            defaultTone: account.defaultTone ?? "",
            topicFocus: account.topicFocus ?? "",
            hookStyle: account.hookStyle ?? "",
            ctaStyle: account.ctaStyle ?? "",
            voiceGuardrails: account.voiceGuardrails ?? ""
          }
        ]
      });
      const score = scoreSourceItem({
        title: item.lastItemTitle ?? "",
        excerpt: item.lastExcerpt ?? "",
        sourceType: item.sourceType,
        importCount: item.importCount,
        skipCount: item.skipCount,
        threadsPickCount: item.threadsPickCount,
        wordpressPickCount: item.wordpressPickCount
      });
      const lane = classifySourceKnowledgeLane({
        title: item.lastItemTitle ?? "",
        excerpt: item.lastExcerpt ?? "",
        sourceType: item.sourceType,
        preferredOutcome: item.preferredOutcome
      });

      return {
        id: item.id,
        label: item.label,
        title: item.lastItemTitle ?? "未命名來源",
        excerpt: item.lastExcerpt ?? "",
        url: item.lastItemUrl ?? item.sourceUrl,
        score,
        lane,
        routedPersona
      };
    })
    .filter(
      (item) => (item.routedPersona ? item.routedPersona.accountId === id : false) || item.score.threadsScore >= item.score.wordpressScore
    )
    .sort((left, right) => {
      const leftScore = Math.max(left.score.threadsScore, left.score.wordpressScore, left.score.commercialScore);
      const rightScore = Math.max(right.score.threadsScore, right.score.wordpressScore, right.score.commercialScore);
      return rightScore - leftScore;
    })
    .slice(0, 6);

  const seoCandidates = gscOpportunities.items.slice(0, 4);

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Accounts"
        title={`${summary.username} 的獨立營運線`}
        description="這裡只看這個帳號自己的 mission、今日發布、來源、優化、長文沉澱與例外。平常你應該在這裡判斷這條線有沒有自己順利跑起來。"
        action={
          <div className="flex flex-wrap gap-3">
            <Link href="/review" className="rounded-full border border-[var(--border)] bg-white/80 px-4 py-2 text-sm">
              去看例外
            </Link>
            <Link href="/accounts" className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm text-white">
              回帳號總覽
            </Link>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {[
          { label: "今日已發", value: String(summary.todayPublishedCount), detail: "這條線今天真的送出的 Threads" },
          { label: "今日已排程", value: String(summary.todayScheduledCount), detail: "今天已排進去等發的 Threads" },
          { label: "可直發", value: String(summary.directDraftCount), detail: "高信心可直接最後確認" },
          { label: "待拍板", value: String(summary.reviewDraftCount), detail: "只有少數例外才應該進這裡" },
          { label: "長文待放大", value: String(summary.wordpressExpansionCount), detail: "可沉到 WordPress 的強內容" },
          { label: "例外", value: String(summary.exceptionCount), detail: "token、失敗任務或未決內容" }
        ].map((card) => (
          <article key={card.label} className="metric-card">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold">{card.value}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 2xl:grid-cols-[1.05fr_0.95fr]">
        <article className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
          <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Account Mission</p>
          <h2 className="mt-2 text-3xl font-semibold">{summary.personaLabel || summary.username}</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{summary.accountMission}</p>
          <div className="mt-5 grid gap-3 xl:grid-cols-3">
            <article className="rounded-[1.2rem] border border-[var(--border)] bg-white/82 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Audience / focus</p>
              <p className="mt-3 text-sm leading-7">{summary.sourcePreference}</p>
            </article>
            <article className="rounded-[1.2rem] border border-[var(--border)] bg-white/82 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Publishing bias</p>
              <p className="mt-3 text-sm leading-7">{summary.laneHint}</p>
            </article>
            <article className="rounded-[1.2rem] border border-[var(--border)] bg-white/82 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Site mission context</p>
              <p className="mt-3 text-sm leading-7">{missionStrategy.primaryFocus}</p>
            </article>
          </div>
        </article>

        <article className="rounded-[2rem] bg-[var(--card-dark)] p-6 text-white shadow-[0_24px_60px_rgba(15,10,7,0.22)]">
          <p className="text-[11px] uppercase tracking-[0.3em] text-white/55">Publishing Lane</p>
          <h2 className="mt-2 text-3xl font-semibold">今天這條線會怎麼自己發</h2>
          <div className="mt-5 space-y-3 text-sm text-white/78">
            <p className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3">
              自動模式：{summary.autopilotEnabled ? (summary.autoGenerateMode === "scheduled" ? "高自動排程" : "高自動先備稿") : "手動"}。
            </p>
            <p className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3">
              今天已發 {summary.todayPublishedCount} 篇、已排程 {summary.todayScheduledCount} 篇。
            </p>
            <p className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3">
              {summary.needsDailyPost
                ? "目前還沒滿一篇，portfolio scheduler 會優先替這條線補稿。"
                : "最低一篇保障已被滿足，接下來會以高信心稿為主繼續放大。"}
            </p>
          </div>
        </article>
      </section>

      <section className="grid gap-4 2xl:grid-cols-2">
        <article className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Source Lane</p>
              <h2 className="mt-2 text-2xl font-semibold">這條線主要在吃哪些來源</h2>
            </div>
            <Link href="/sources" className="text-sm font-medium text-[var(--accent)]">
              看來源池
            </Link>
          </div>
          <div className="mt-5 max-h-[24rem] space-y-3 overflow-y-auto pr-1">
            {routedSources.map((item) => (
              <article key={item.id} className="rounded-[1.35rem] border border-[var(--border)] bg-white/82 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold">{item.label}</p>
                  <span className="pill-tag">{item.lane.label}</span>
                </div>
                <p className="mt-2 text-sm font-medium leading-7">{item.title}</p>
                <p className="mt-2 break-words text-sm leading-7 text-[var(--muted)]">{item.excerpt}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  <span className="rounded-full bg-white px-4 py-2">Threads {item.score.threadsScore}</span>
                  <span className="rounded-full bg-white px-4 py-2">WordPress {item.score.wordpressScore}</span>
                  <span className="rounded-full bg-white px-4 py-2">{item.score.qualityLabel}</span>
                </div>
              </article>
            ))}
            {routedSources.length === 0 ? (
              <article className="rounded-[1.35rem] border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)]">
                目前還沒有被這個帳號優先吸收的高價值來源。
              </article>
            ) : null}
          </div>
        </article>

        <article className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Optimization Lane</p>
              <h2 className="mt-2 text-2xl font-semibold">14 天觀察、留言優化與 SEO 回補</h2>
            </div>
            <Link href="/analytics" className="text-sm font-medium text-[var(--accent)]">
              看流量層
            </Link>
          </div>
          <div className="mt-5 space-y-3">
            <article className="rounded-[1.35rem] border border-[var(--border)] bg-white/82 p-4">
              <p className="text-sm font-semibold">帳號自己的優化稿</p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                目前有 {optimizationDrafts.length} 篇 14 天觀察後的優化稿，待你最後看是否值得再打一輪。
              </p>
            </article>
            <div className="max-h-[18rem] space-y-3 overflow-y-auto pr-1">
              {seoCandidates.map((item) => (
                <article key={item.id} className="rounded-[1.35rem] border border-[var(--border)] bg-white/82 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold">{item.query ?? item.page}</p>
                    <span className="pill-tag">{item.confidence === "high" ? "高信心" : item.confidence === "medium" ? "中信心" : "觀察"}</span>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{item.reason}</p>
                </article>
              ))}
              {seoCandidates.length === 0 ? (
                <article className="rounded-[1.35rem] border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)]">
                  目前還沒有可回補到這條線的 Search Console 機會。
                </article>
              ) : null}
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-4 2xl:grid-cols-2">
        <article className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">WordPress Lane</p>
              <h2 className="mt-2 text-2xl font-semibold">長文沉澱與第二增長曲線</h2>
            </div>
            <Link href="/wordpress" className="text-sm font-medium text-[var(--accent)]">
              看長文層
            </Link>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <article className="rounded-[1.2rem] border border-[var(--border)] bg-white/82 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">待擴寫</p>
              <p className="mt-3 text-3xl font-semibold">{accountExpansionCandidates.length}</p>
            </article>
            <article className="rounded-[1.2rem] border border-[var(--border)] bg-white/82 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">已沉草稿</p>
              <p className="mt-3 text-3xl font-semibold">{relatedWordPressPosts.length}</p>
            </article>
            <article className="rounded-[1.2rem] border border-[var(--border)] bg-white/82 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">站台模式</p>
              <p className="mt-3 text-lg font-semibold">
                {settings?.wordpressPublishMode === "auto_publish" ? "Auto publish" : "Draft only"}
              </p>
            </article>
          </div>
          <div className="mt-5 max-h-[20rem] space-y-3 overflow-y-auto pr-1">
            {accountExpansionCandidates.map((item) => (
              <article key={item.id} className="rounded-[1.35rem] border border-[var(--border)] bg-white/82 p-4">
                <p className="text-sm font-semibold">{item.suggestedTitle}</p>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{item.reason}</p>
                <p className="mt-2 text-sm leading-7 text-[var(--accent-strong)]">{item.missionReason}</p>
              </article>
            ))}
            {accountExpansionCandidates.length === 0 ? (
              <article className="rounded-[1.35rem] border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)]">
                這條線目前還沒有值得自動沉成長文的強內容。
              </article>
            ) : null}
          </div>
        </article>

        <article className="rounded-[2rem] bg-[var(--card-dark)] p-6 text-white shadow-[0_24px_60px_rgba(15,10,7,0.22)]">
          <p className="text-[11px] uppercase tracking-[0.3em] text-white/55">Exceptions</p>
          <h2 className="mt-2 text-2xl font-semibold">只有這些例外需要你出手</h2>
          <div className="mt-5 space-y-3">
            {summary.tokenStatus === "expiring" ? (
              <article className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/78">
                Threads token 7 天內會到期，這是這條線最該優先修的例外。
              </article>
            ) : null}
            {reviewDrafts.length > 0 ? (
              <article className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/78">
                目前還有 {reviewDrafts.length} 篇待拍板稿，這些是系統自己不想亂決定的內容。
              </article>
            ) : null}
            {exceptionLogs.map((log) => (
              <article key={log.id} className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/78">
                <p className="font-medium uppercase text-white/85">{log.actionType}</p>
                <p className="mt-2 break-words leading-7">{log.detail ?? "背景任務失敗"}</p>
              </article>
            ))}
            {!exceptionLogs.length && !reviewDrafts.length && summary.tokenStatus !== "expiring" ? (
              <article className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/78">
                這條線目前沒有明顯例外，系統可以自己繼續跑。
              </article>
            ) : null}
          </div>
        </article>
      </section>

      <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Publishing Lane</p>
            <h2 className="mt-2 text-2xl font-semibold">這條線今天有哪些內容在跑</h2>
          </div>
          <Link href="/posts" className="text-sm font-medium text-[var(--accent)]">
            去 Queue
          </Link>
        </div>
        <div className="mt-5 grid gap-4 2xl:grid-cols-3">
          <article className="rounded-[1.35rem] border border-[var(--border)] bg-white/82 p-4">
            <p className="text-sm font-semibold">可直接最後確認</p>
            <div className="mt-3 max-h-[14rem] space-y-3 overflow-y-auto pr-1">
              {directDrafts.map((post) => (
                <Link key={post.id} href={`/review/${post.id}`} className="block rounded-[1rem] border border-[var(--border)] bg-white px-3 py-3 text-sm">
                  <p className="font-medium">{post.title ?? post.text}</p>
                  <p className="mt-2 text-[var(--muted)]">{post.candidateRationale ?? "高信心 Threads 候選稿"}</p>
                </Link>
              ))}
              {directDrafts.length === 0 ? <p className="text-sm text-[var(--muted)]">目前沒有可直接最後確認的稿。</p> : null}
            </div>
          </article>
          <article className="rounded-[1.35rem] border border-[var(--border)] bg-white/82 p-4">
            <p className="text-sm font-semibold">待拍板稿</p>
            <div className="mt-3 max-h-[14rem] space-y-3 overflow-y-auto pr-1">
              {reviewDrafts.map((post) => (
                <Link key={post.id} href={`/review/${post.id}`} className="block rounded-[1rem] border border-[var(--border)] bg-white px-3 py-3 text-sm">
                  <p className="font-medium">{post.title ?? post.text}</p>
                  <p className="mt-2 text-[var(--muted)]">{post.laneReason ?? "需要先做 assignment 與最後拍板。"}</p>
                </Link>
              ))}
              {reviewDrafts.length === 0 ? <p className="text-sm text-[var(--muted)]">目前沒有待拍板稿。</p> : null}
            </div>
          </article>
          <article className="rounded-[1.35rem] border border-[var(--border)] bg-white/82 p-4">
            <p className="text-sm font-semibold">已排程 / 已發布</p>
            <div className="mt-3 max-h-[14rem] space-y-3 overflow-y-auto pr-1">
              {[...scheduledPosts, ...publishedToday]
                .slice(0, 8)
                .map((post) => (
                  <article key={post.id} className="rounded-[1rem] border border-[var(--border)] bg-white px-3 py-3 text-sm">
                    <p className="font-medium">{post.title ?? post.textContent ?? "未命名內容"}</p>
                    <p className="mt-2 text-[var(--muted)]">
                      {post.status === "scheduled" ? "已排程，系統會自動發出。" : "今天已經成功發布。"}
                    </p>
                  </article>
                ))}
              {scheduledPosts.length + publishedToday.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">今天這條線還沒有排程或已發布內容。</p>
              ) : null}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
