import Link from "next/link";

import { AutopilotHeartbeat } from "@/components/dashboard/autopilot-heartbeat";
import { PageIntro } from "@/components/dashboard/page-intro";
import {
  getAnalyticsOverview,
  buildLearningSignals,
  getAccountOperatingSummaries,
  getKeywordHitSummaries,
  getPortfolioOperatingSnapshot,
  getPostSummaries
} from "@/lib/dashboard-data";
import { scoreSourceItem } from "@/lib/content/source-inbox";
import { getGscOpportunityQueue } from "@/lib/gsc";
import { summarizeMissionStrategy } from "@/lib/mission-scoring";
import { getOpsDiagnostics } from "@/lib/ops-diagnostics";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DeskPage() {
  const [settings, accountSummaries, posts, keywordHits, sourceItems, gscOpportunities, failedLogs, analyticsOverview, portfolio, diagnostics] =
    await Promise.all([
      prisma.appSettings.findFirst(),
      getAccountOperatingSummaries(),
      getPostSummaries(),
      getKeywordHitSummaries(),
      prisma.sourceWatch.findMany({
        where: { isActive: true, lastItemTitle: { not: null } },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        take: 16
      }).catch(() => []),
      getGscOpportunityQueue().catch(() => ({
        configured: false,
        items: [],
        message: "目前還讀不到 Search Console 機會隊列。"
      })),
      prisma.automationLog.findMany({
        where: {
          status: "failed"
        },
        include: {
          account: {
            select: {
              platformUsername: true
            }
          }
        },
        orderBy: {
          executedAt: "desc"
        },
        take: 6
      }).catch(() => []),
      getAnalyticsOverview({ window: "30d", accountId: "all" }).catch(() => null),
      getPortfolioOperatingSnapshot(),
      getOpsDiagnostics()
    ]);

  const missionTitle = settings?.missionTitle?.trim() || "7 個月內，讓接入帳號進入台灣前 50 大理財內容流量級";
  const missionCurrentValue = settings?.missionCurrentValue ?? 0;
  const missionTargetValue = settings?.missionTargetValue ?? 30000;
  const missionUnit = settings?.missionUnit?.trim() || "月自然流量";
  const missionProgress =
    missionTargetValue > 0 ? Math.min(100, Math.round((missionCurrentValue / missionTargetValue) * 1000) / 10) : 0;
  const missionStrategy = summarizeMissionStrategy({
    title: settings?.missionTitle,
    goal: settings?.editorialGoal,
    direction: settings?.editorialDirection,
    unit: settings?.missionUnit,
    currentValue: settings?.missionCurrentValue,
    targetValue: settings?.missionTargetValue
  });

  const todayPublished = portfolio.todayPublished;
  const todayScheduled = portfolio.todayScheduled;
  const totalPendingReview = portfolio.pendingReview;
  const totalDirectDrafts = portfolio.directDrafts;
  const totalOptimization = portfolio.optimizationDrafts;
  const totalWordPressExpansion = portfolio.wordpressExpansion;
  const accountsNeedingCoverage = accountSummaries.filter((account) => account.needsDailyPost);
  const expiringAccounts = accountSummaries.filter((account) => account.tokenStatus === "expiring");
  const healthCards = [
    {
      label: "Database",
      value: diagnostics.database.ready ? "Ready" : "Check",
      detail: diagnostics.database.detail
    },
    {
      label: "Schema",
      value: diagnostics.schema.looksDrifted ? "Drifted" : "Aligned",
      detail: diagnostics.schema.detail
    },
    {
      label: "AI",
      value: diagnostics.aiHealth.gemini.ok ? "Ready" : "Fallback",
      detail: diagnostics.aiHealth.gemini.message
    },
    {
      label: "Scheduler",
      value:
        diagnostics.envChecks.some((check) => check.key === "INNGEST_SIGNING_KEY" && check.status === "present") &&
        diagnostics.envChecks.some((check) => check.key === "INNGEST_EVENT_KEY" && check.status === "present") &&
        diagnostics.envChecks.some((check) => check.key === "INNGEST_SERVE_ORIGIN" && check.status === "present")
          ? "Configured"
          : "Check",
      detail:
        portfolio.failedRuns24h > 0
          ? `過去 24 小時有 ${portfolio.failedRuns24h} 筆失敗背景任務`
          : "Inngest env 看起來齊全，最近 24 小時沒有失敗背景任務"
    },
    {
      label: "Daily Report",
      value:
        diagnostics.envChecks.some((check) => check.key === "DISCORD_DAILY_WEBHOOK_URL" && check.status === "present") ||
        (diagnostics.envChecks.some((check) => check.key === "TELEGRAM_BOT_TOKEN" && check.status === "present") &&
          diagnostics.envChecks.some((check) => check.key === "TELEGRAM_CHAT_ID" && check.status === "present"))
          ? "Configured"
          : "Optional",
      detail:
        diagnostics.deployChecklist.find((item) => item.label === "每日日報 / Discord / Telegram")?.detail ??
        "尚未確認通知通道"
    }
  ];

  const todayDraftPicks = posts
    .filter((post) => post.platform === "threads" && post.status === "draft")
    .sort((left, right) => (right.reviewScore ?? 0) - (left.reviewScore ?? 0))
    .slice(0, 5);
  const topSources = sourceItems
    .map((item) => ({
      id: item.id,
      label: item.label,
      title: item.lastItemTitle ?? "未命名來源",
      excerpt: item.lastExcerpt ?? "",
      score: scoreSourceItem({
        title: item.lastItemTitle ?? "",
        excerpt: item.lastExcerpt ?? "",
        sourceType: item.sourceType,
        importCount: item.importCount,
        skipCount: item.skipCount,
        threadsPickCount: item.threadsPickCount,
        wordpressPickCount: item.wordpressPickCount
      })
    }))
    .sort((left, right) => {
      const leftScore = Math.max(left.score.threadsScore, left.score.wordpressScore, left.score.commercialScore);
      const rightScore = Math.max(right.score.threadsScore, right.score.wordpressScore, right.score.commercialScore);
      return rightScore - leftScore;
    })
    .slice(0, 4);
  const learningSignals = buildLearningSignals({
    bestPost: analyticsOverview?.topPosts[0]
      ? {
          text: analyticsOverview.topPosts[0].text,
          views: analyticsOverview.topPosts[0].views,
          replies: analyticsOverview.topPosts[0].replies,
          reposts: analyticsOverview.topPosts[0].reposts,
          shares: analyticsOverview.topPosts[0].shares
        }
      : null,
    directDraftCount: totalDirectDrafts,
    optimizationCount: totalOptimization,
    gscTopQuery: gscOpportunities.items[0]
      ? {
          query: gscOpportunities.items[0].query ?? gscOpportunities.items[0].page,
          clicks: gscOpportunities.items[0].clicks,
          impressions: gscOpportunities.items[0].impressions
        }
      : null,
    accountsMissingCoverage: accountsNeedingCoverage.map((account) => account.username)
  });

  const interventionItems = [
    settings?.automationPaused
      ? {
          label: "整站自動化已暫停",
          detail: "PM Ops 現在不會自己找題、產文、排程或沉長文。",
          href: "/accounts",
          action: "恢復運轉"
        }
      : null,
    accountsNeedingCoverage.length > 0
      ? {
          label: `今天還缺一篇 ${accountsNeedingCoverage.length} 條線`,
          detail: `系統會優先補 ${accountsNeedingCoverage.map((account) => account.username).join("、")}。`,
          href: "/accounts",
          action: "看帳號營運線"
        }
      : null,
    expiringAccounts.length > 0
      ? {
          label: `Token 快到期 ${expiringAccounts.length}`,
          detail: `${expiringAccounts.map((account) => account.username).join("、")} 需要重新授權，不然自動發布會斷。`,
          href: "/accounts",
          action: "去處理"
        }
      : null,
    totalPendingReview > 0
      ? {
          label: `待拍板 ${totalPendingReview}`,
          detail: "這些是系統自己不想亂決定的內容，你只要處理這些例外。",
          href: "/review",
          action: "去拍板"
        }
      : null,
    failedLogs.length > 0
      ? {
          label: `失敗任務 ${failedLogs.length}`,
          detail: "背景工廠有失敗任務，會影響飛輪持續運轉。",
          href: "/factory",
          action: "看失敗原因"
        }
      : null
  ].filter(Boolean) as Array<{ label: string; detail: string; href: string; action: string }>;

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="PM Ops"
        title="先看總控盤，再決定今天只要介入哪幾個例外"
        description="這裡只看全帳號 mission、每日進度、例外、搜尋機會與今天最值得被放大的內容。來源池、Compose、WordPress 都降成二級工作區。"
        action={
          <div className="flex flex-wrap gap-3">
            <Link href="/review" className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm text-white">
              去處理例外
            </Link>
            <Link href="/factory" className="rounded-full border border-[var(--border)] bg-white/80 px-4 py-2 text-sm">
              看工廠
            </Link>
          </div>
        }
      />

      <section className="grid gap-4">
        <article className="min-w-0 rounded-[2rem] bg-[var(--card-dark)] p-6 text-white shadow-[0_24px_60px_rgba(15,10,7,0.22)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/55">Portfolio Mission</p>
              <h2 className="mt-2 text-[2rem] font-semibold leading-tight xl:text-3xl">{missionTitle}</h2>
              <p className="mt-3 break-words text-sm text-white/72">
                {missionCurrentValue.toLocaleString("zh-TW")} / {missionTargetValue.toLocaleString("zh-TW")} {missionUnit}
              </p>
            </div>
            <div className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3 text-left sm:text-right">
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/55">Autopilot</p>
              <p className="mt-2 text-lg font-semibold">
                {portfolio.autopilotMode === "review_only"
                  ? "只進 Review"
                  : portfolio.autopilotMode === "auto_schedule"
                    ? "高自動排程"
                    : "近乎全自動"}
              </p>
              <p className="mt-1 text-xs text-white/60">{portfolio.automationPaused ? "目前已暫停" : "背景飛輪自動運轉中"}</p>
            </div>
          </div>

          <div className="mt-5 rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span>Mission 進度</span>
              <span>{missionProgress}%</span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-white" style={{ width: `${Math.max(5, missionProgress)}%` }} />
            </div>
            <p className="mt-3 break-words text-sm text-white/68">
              {settings?.editorialDirection?.trim()
                ? settings.editorialDirection.trim()
                : "目前尚未設定站台級 editorial direction，建議到 Accounts 補上全站方向。"}
            </p>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-3">
            <article className="rounded-[1.1rem] border border-white/10 bg-white/5 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/55">主軸</p>
              <p className="mt-2 text-sm leading-7 text-white/78">{missionStrategy.primaryFocus}</p>
            </article>
            <article className="rounded-[1.1rem] border border-white/10 bg-white/5 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/55">Threads 偏向</p>
              <p className="mt-2 text-sm leading-7 text-white/78">{missionStrategy.threadBias}</p>
            </article>
            <article className="rounded-[1.1rem] border border-white/10 bg-white/5 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/55">WordPress / 優化</p>
              <p className="mt-2 text-sm leading-7 text-white/78">
                {missionStrategy.wordpressBias} {missionStrategy.optimizationBias}
              </p>
            </article>
          </div>
        </article>

        <article className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
          <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Today Numbers</p>
          <h2 className="mt-2 text-3xl font-semibold">今天整個站自己做了多少事</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              { label: "今日已發", value: String(todayPublished), detail: "真正已發出的 Threads" },
              { label: "今日已排程", value: String(todayScheduled), detail: "已進排程、等待系統送出" },
              { label: "可直發", value: String(totalDirectDrafts), detail: "高信心內容可直接最後確認" },
              { label: "待拍板", value: String(totalPendingReview), detail: "只有少數例外需要你決定" },
              { label: "14 天優化稿", value: String(totalOptimization), detail: "系統已自動產出的優化候選" },
              { label: "WordPress 待放大", value: String(totalWordPressExpansion), detail: "強內容可沉長文或 SEO" }
            ].map((card) => (
              <article key={card.label} className="rounded-[1.2rem] border border-[var(--border)] bg-white/82 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{card.label}</p>
                <p className="mt-3 text-3xl font-semibold">{card.value}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">{card.detail}</p>
              </article>
            ))}
          </div>
          <div className="mt-5">
            <AutopilotHeartbeat />
          </div>
          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {diagnostics.runtimeChecks.map((card) => (
              <article key={card.label} className="rounded-[1.2rem] border border-[var(--border)] bg-white/82 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{card.label}</p>
                  <span
                    className={`rounded-full px-3 py-1 text-xs ${
                      card.tone === "good"
                        ? "bg-emerald-50 text-emerald-700"
                        : card.tone === "warn"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    {card.tone}
                  </span>
                </div>
                <p className="mt-3 text-2xl font-semibold">{card.value}</p>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{card.detail}</p>
              </article>
            ))}
          </div>
          <div className="mt-4 space-y-3">
            {diagnostics.runtimeLogs.slice(0, 2).map((log) => (
              <article key={log.id} className="rounded-[1.2rem] border border-[var(--border)] bg-white/72 p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{log.actionType}</p>
                  <span
                    className={`rounded-full px-3 py-1 text-xs ${
                      log.status === "executed" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    {log.status}
                  </span>
                </div>
                <p className="mt-2 text-xs uppercase tracking-[0.22em] text-[var(--muted)]">{log.executedAt}</p>
                <p className="mt-2 text-[var(--muted)]">{log.detail}</p>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Operating Health</p>
            <h2 className="mt-2 text-2xl font-semibold">先確認這套飛輪能不能穩定自己運轉</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
              這層只看會不會卡住營運的底層健康度：DB、schema、AI、排程與每日日報。如果這裡出現紅旗，功能再多都不算真的可用。
            </p>
          </div>
          <Link href="/ops" className="rounded-full border border-[var(--border)] bg-white/80 px-4 py-2 text-sm">
            去 Ops 診斷
          </Link>
        </div>
        <div className="mt-5 grid gap-3 xl:grid-cols-5">
          {healthCards.map((card) => (
            <article key={card.label} className="rounded-[1.25rem] border border-[var(--border)] bg-white/82 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{card.label}</p>
              <p className="mt-3 text-2xl font-semibold">{card.value}</p>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{card.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4">
        <article className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Account Portfolio</p>
              <h2 className="mt-2 text-3xl font-semibold">各帳號今天有沒有自己順利跑起來</h2>
            </div>
            <Link href="/accounts" className="text-sm font-medium text-[var(--accent)]">
              去看帳號營運線
            </Link>
          </div>
          <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-white/75">
            <div className="border-b border-[var(--border)] px-4 py-3 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              每個帳號今天的最小營運狀態
            </div>
            <div className="max-h-[24rem] overflow-y-auto">
              {accountSummaries.map((account) => (
                <Link
                  key={account.id}
                  href={`/accounts/${account.id}`}
                  className="block border-b border-[var(--border)] px-4 py-4 transition hover:bg-white/88 last:border-b-0"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{account.username}</p>
                      <p className="mt-1 break-words text-sm text-[var(--muted)]">{account.accountMission}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {account.needsDailyPost ? "今天還缺一篇，系統會優先補這條線。" : account.laneHint}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-[11px] ${
                        account.tokenStatus === "healthy"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {account.tokenStatus === "healthy" ? "ok" : "warn"}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-4">
                    <div className="rounded-[1rem] border border-[var(--border)] bg-white/72 px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">已發</p>
                      <p className="mt-2 text-xl font-semibold">{account.todayPublishedCount}</p>
                    </div>
                    <div className="rounded-[1rem] border border-[var(--border)] bg-white/72 px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">排程</p>
                      <p className="mt-2 text-xl font-semibold">{account.todayScheduledCount}</p>
                    </div>
                    <div className="rounded-[1rem] border border-[var(--border)] bg-white/72 px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">長文</p>
                      <p className="mt-2 text-xl font-semibold">{account.wordpressExpansionCount}</p>
                    </div>
                    <div className="rounded-[1rem] border border-[var(--border)] bg-white/72 px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">例外</p>
                      <p className="mt-2 text-xl font-semibold">{account.exceptionCount}</p>
                    </div>
                  </div>
                </Link>
              ))}
              {accountSummaries.length === 0 ? (
                <div className="px-4 py-4 text-sm text-[var(--muted)]">目前還沒有啟用中的帳號營運線。</div>
              ) : null}
            </div>
          </div>
        </article>

        <article className="rounded-[2rem] bg-[var(--card-dark)] p-6 text-white shadow-[0_24px_60px_rgba(15,10,7,0.22)]">
          <p className="text-[11px] uppercase tracking-[0.3em] text-white/55">Need Your Attention</p>
          <h2 className="mt-2 text-3xl font-semibold">真正要你介入的只有這些</h2>
          <div className="mt-5 space-y-3">
            {interventionItems.length ? (
              interventionItems.map((item) => (
                <article key={item.label} className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="mt-2 text-sm leading-7 text-white/72">{item.detail}</p>
                  <Link href={item.href} className="mt-3 inline-flex text-sm font-medium text-white">
                    {item.action}
                  </Link>
                </article>
              ))
            ) : (
              <article className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/72">
                目前沒有明顯例外。系統可以自己持續找題、產文、排程、沉長文與跑 SEO 回補。
              </article>
            )}
          </div>
        </article>
      </section>

      <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Learning Update</p>
            <h2 className="mt-2 text-2xl font-semibold">系統最近學到什麼，下一輪準備怎麼改</h2>
          </div>
          <Link href="/analytics" className="text-sm font-medium text-[var(--accent)]">
            看完整驗證層
          </Link>
        </div>
        <div className="mt-5 grid gap-3 xl:grid-cols-2">
          {learningSignals.length ? (
            learningSignals.map((item) => (
              <article key={item.label} className="rounded-[1.35rem] border border-[var(--border)] bg-white/82 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{item.label}</p>
                <p className="mt-3 text-sm leading-7 text-[var(--foreground)]">{item.observation}</p>
                <p className="mt-3 rounded-[1rem] border border-[var(--border)] bg-[rgba(255,252,248,0.86)] px-4 py-3 text-sm leading-7 text-[var(--accent-strong)]">
                  {item.update}
                </p>
              </article>
            ))
          ) : (
            <article className="rounded-[1.35rem] border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)] xl:col-span-2">
              還在等第一輪足夠的 Threads / GA4 / GSC 訊號。等系統跑夠幾天後，這裡會開始像每日學習回填一樣告訴你它要怎麼改下一輪。
            </article>
          )}
        </div>
      </section>

      <section className="grid gap-4">
        <article className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Search Growth</p>
              <h2 className="mt-2 text-2xl font-semibold">搜尋層現在最該補的頁面與查詢</h2>
            </div>
            <Link href="/analytics" className="text-sm font-medium text-[var(--accent)]">
              去 Analytics
            </Link>
          </div>
          <div className="mt-5 max-h-[18rem] space-y-3 overflow-y-auto pr-1">
            {gscOpportunities.items.slice(0, 5).map((item) => (
              <article key={item.id} className="rounded-[1.35rem] border border-[var(--border)] bg-white/82 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold">{item.query ?? item.page}</p>
                  <span className="pill-tag">{item.confidence === "high" ? "高信心" : item.confidence === "medium" ? "中信心" : "觀察"}</span>
                </div>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{item.reason}</p>
                <p className="mt-2 text-sm leading-7 text-[var(--accent-strong)]">{item.action}</p>
              </article>
            ))}
            {!gscOpportunities.items.length ? (
              <article className="rounded-[1.35rem] border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)]">
                {gscOpportunities.message}
              </article>
            ) : null}
          </div>
        </article>

        <article className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">High-Value Signals</p>
              <h2 className="mt-2 text-2xl font-semibold">今天值得先放大的來源與草稿</h2>
            </div>
            <Link href="/factory" className="text-sm font-medium text-[var(--accent)]">
              去工廠
            </Link>
          </div>
          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {topSources.map((item) => (
              <article key={item.id} className="rounded-[1.35rem] border border-[var(--border)] bg-white/82 p-4">
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="rounded-full bg-white px-4 py-2">Threads {item.score.threadsScore}</span>
                  <span className="rounded-full bg-white px-4 py-2">WordPress {item.score.wordpressScore}</span>
                  <span className="rounded-full bg-white px-4 py-2">{item.score.qualityLabel}</span>
                </div>
                <p className="mt-3 text-sm font-semibold leading-7">{item.title}</p>
                <p className="mt-2 break-words text-sm leading-7 text-[var(--muted)]">{item.excerpt}</p>
              </article>
            ))}
            {todayDraftPicks.map((post) => (
              <article key={post.id} className="rounded-[1.35rem] border border-[var(--border)] bg-white/82 p-4">
                <p className="text-sm font-semibold">{post.title ?? post.text}</p>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                  {post.candidateRationale ?? post.laneReason ?? "高信心候選稿，值得放進今天的 Threads / WordPress 飛輪。"}
                </p>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        {[
          { label: "Review", href: "/review", detail: "所有人工例外與高價值決策" },
          { label: "Factory", href: "/factory", detail: "背景工廠、已處理、失敗待修復" },
          { label: "Sources", href: "/sources", detail: "來源供應鏈、starter packs 與 discovery" },
          { label: "WordPress", href: "/wordpress", detail: "長文沉澱、SEO 稿與轉介承接面" }
        ].map((item) => (
          <Link key={item.label} href={item.href} className="glass-panel rounded-[1.5rem] border border-[var(--border)] p-5 transition hover:bg-white/84">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">{item.label}</p>
            <p className="mt-3 text-sm leading-7">{item.detail}</p>
          </Link>
        ))}
      </section>

      <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Light Signals</p>
            <h2 className="mt-2 text-2xl font-semibold">最近的關鍵字與社群訊號</h2>
          </div>
          <Link href="/keywords" className="text-sm font-medium text-[var(--accent)]">
            看全部
          </Link>
        </div>
        <div className="mt-5 max-h-[18rem] space-y-3 overflow-y-auto pr-1">
          {keywordHits.slice(0, 5).map((hit) => (
            <article key={hit.id} className="rounded-[1.35rem] border border-[var(--border)] bg-white/82 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">{hit.keyword}</p>
                <span className="pill-tag">{hit.actionTaken}</span>
              </div>
              <p className="mt-2 text-sm text-[var(--muted)]">{hit.author}</p>
              <p className="mt-2 break-words text-sm leading-7 text-[var(--accent-strong)]">{hit.excerpt}</p>
            </article>
          ))}
          {keywordHits.length === 0 ? (
            <article className="rounded-[1.35rem] border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)]">
              目前沒有新的關鍵字命中，代表今天先專心看自動飛輪與搜尋機會就好。
            </article>
          ) : null}
        </div>
      </section>
    </div>
  );
}
