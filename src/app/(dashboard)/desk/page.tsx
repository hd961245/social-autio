import Link from "next/link";

import { ContentEngineForm } from "@/components/dashboard/content-engine-form";
import { AutopilotHeartbeat } from "@/components/dashboard/autopilot-heartbeat";
import { PageIntro } from "@/components/dashboard/page-intro";
import { PostsList } from "@/components/dashboard/posts-list";
import { QueueActions } from "@/components/dashboard/queue-actions";
import { SourceInbox } from "@/components/dashboard/source-inbox";
import { SourceWatchlist, type SourceItem as SourceWatchItem } from "@/components/dashboard/source-watchlist";
import { getAccountSummaries, getAnalyticsOverview, getDashboardStats, getKeywordHitSummaries, getPostSummaries } from "@/lib/dashboard-data";
import { classifySourceKnowledgeLane, routeSourceToPersona, scoreSourceItem } from "@/lib/content/source-inbox";
import { summarizeMissionStrategy } from "@/lib/mission-scoring";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DESK_TABS = [
  { id: "overview", label: "PM Ops", description: "mission、待拍板、今日來源與兩條營運軌" },
  { id: "inbox", label: "Source Inbox", description: "先看今天值得處理的來源內容" },
  { id: "sources", label: "Sources", description: "管理固定追蹤來源與 discovery 名單" },
  { id: "engine", label: "Factory", description: "把素材送進 AI 寫文工廠" },
  { id: "queue", label: "Review Queue", description: "編修草稿、排程與查看發布紀錄" }
] as const;

const ONBOARDING_STEPS = [
  {
    label: "1. 先決定今天題目",
    detail: "先從高訊號來源和 Rewrite Radar 選一題，不要一打開就直接寫。",
    href: "/desk?tab=inbox",
    action: "去 Inbox"
  },
  {
    label: "2. 讓 AI 幫你起稿",
    detail: "題目確定後，進 Compose 或 AI 起稿，先產出可修的 Threads 草稿。",
    href: "/compose",
    action: "去 Compose"
  },
  {
    label: "3. 發後再沉長文",
    detail: "Threads 有訊號後，再把值得放大的題目沉到 WordPress 草稿，不要反過來。",
    href: "/wordpress",
    action: "去 WordPress"
  }
] as const;

type DeskTab = (typeof DESK_TABS)[number]["id"];

export default async function DeskPage({
  searchParams
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const activeTab: DeskTab = DESK_TABS.some((tab) => tab.id === params.tab) ? (params.tab as DeskTab) : "overview";

  let sourceItems: Awaited<ReturnType<typeof prisma.sourceWatch.findMany>> = [];
  let settings: Awaited<ReturnType<typeof prisma.appSettings.findFirst>> = null;
  let ingestions: Awaited<ReturnType<typeof prisma.ingestionRecord.findMany>> = [];
  let threadsAccounts: Awaited<ReturnType<typeof prisma.platformAccount.findMany>> = [];
  let autopilotLogs: Awaited<ReturnType<typeof prisma.automationLog.findMany>> = [];
  let flywheelLogs: Awaited<ReturnType<typeof prisma.automationLog.findMany>> = [];
  let drafts: Array<
    Awaited<ReturnType<typeof prisma.post.findMany<{ include: { account: true } }>>>[number]
  > = [];
  const posts = await getPostSummaries();
  const analytics = await getAnalyticsOverview({ window: "30d", accountId: "all" });
  const [operatingSnapshot, accountSummaries, keywordHits] = await Promise.all([
    getDashboardStats(),
    getAccountSummaries(),
    getKeywordHitSummaries()
  ]);
  const todayDraftPicks = posts
    .filter((post) => post.platform === "threads" && post.status === "draft" && post.isFreshToday)
    .sort((left, right) => (right.reviewScore ?? 0) - (left.reviewScore ?? 0))
    .slice(0, 3);
  const directPublishDraftPicks = todayDraftPicks.filter((post) => post.reviewLane === "direct");
  const reviewFirstDraftPicks = todayDraftPicks.filter((post) => post.reviewLane !== "direct");

  try {
    [sourceItems, settings, ingestions, drafts, threadsAccounts, autopilotLogs, flywheelLogs] = await Promise.all([
      prisma.sourceWatch.findMany({
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }]
      }),
      prisma.appSettings.findFirst(),
      prisma.ingestionRecord.findMany({
        orderBy: { createdAt: "desc" },
        take: 6
      }),
      prisma.post.findMany({
        where: { status: "draft" },
        include: { account: true },
        orderBy: { createdAt: "desc" },
        take: 8
      }),
      prisma.platformAccount.findMany({
        where: { platform: "threads", isActive: true },
        orderBy: [{ isActive: "desc" }, { createdAt: "asc" }]
      }),
      prisma.automationLog.findMany({
        where: {
          actionType: "daily_persona_generation"
        },
        orderBy: {
          executedAt: "desc"
        },
        take: 24
      }),
      prisma.automationLog.findMany({
        where: {
          actionType: {
            in: ["optimization_flywheel", "auto_wordpress_expansion"]
          }
        },
        orderBy: {
          executedAt: "desc"
        },
        take: 30
      })
    ]);
  } catch {}

  const inboxItems = sourceItems
    .filter((item) => item.isActive && item.lastItemTitle)
    .sort((a, b) => (b.lastFetchedAt?.getTime() ?? 0) - (a.lastFetchedAt?.getTime() ?? 0))
    .map((item) => {
      const score = scoreSourceItem({
        title: item.lastItemTitle ?? "",
        excerpt: item.lastExcerpt ?? "",
        sourceType: item.sourceType,
        importCount: item.importCount,
        skipCount: item.skipCount,
        threadsPickCount: item.threadsPickCount,
        wordpressPickCount: item.wordpressPickCount
      });
      const routedPersona = routeSourceToPersona({
        title: item.lastItemTitle ?? "",
        excerpt: item.lastExcerpt ?? "",
        accounts: threadsAccounts.map((account) => ({
          id: account.id,
          username: `@${account.platformUsername}`,
          personaLabel: account.personaLabel ?? "",
          personaPrompt: account.personaPrompt ?? "",
          defaultTone: account.defaultTone ?? "",
          topicFocus: account.topicFocus ?? "",
          hookStyle: account.hookStyle ?? "",
          ctaStyle: account.ctaStyle ?? "",
          voiceGuardrails: account.voiceGuardrails ?? ""
        }))
      });
      const lane = classifySourceKnowledgeLane({
        title: item.lastItemTitle ?? "",
        excerpt: item.lastExcerpt ?? "",
        sourceType: item.sourceType,
        preferredOutcome: item.preferredOutcome
      });
      const laneLabel: "官方一手訊號" | "深度拆解" | "快節奏快評" | "長期沉澱" = item.label.includes("官方")
        ? "官方一手訊號"
        : lane.label;

      return {
        id: item.id,
        label: item.label,
        sourceType: item.sourceType as "rss" | "url" | "site",
        laneLabel,
        lastFetchedAt: item.lastFetchedAt?.toLocaleString("zh-TW", { hour12: false }) ?? "尚未刷新",
        title: item.lastItemTitle ?? "未命名來源內容",
        url: item.lastItemUrl ?? item.sourceUrl,
        excerpt: item.lastExcerpt ?? "",
        status: (item.lastHandledStatus as "new" | "imported" | "skipped" | null) ?? "new",
        threadsScore: score.threadsScore,
        wordpressScore: score.wordpressScore,
        commercialScore: score.commercialScore,
        qualityTier: score.qualityTier,
        qualityLabel: score.qualityLabel,
        recommendation: score.recommendation,
        reasons: score.reasons,
        memoryNote: score.memoryNote,
        routedPersona
      };
    });
  const topInboxSignals = inboxItems
    .filter((item) => item.status === "new")
    .sort((left, right) => {
      const leftStrength = Math.max(left.threadsScore, left.wordpressScore, left.commercialScore);
      const rightStrength = Math.max(right.threadsScore, right.wordpressScore, right.commercialScore);
      return rightStrength - leftStrength;
    })
    .slice(0, 3);

  const trackedSources: SourceWatchItem[] = sourceItems.map((item) => ({
    id: item.id,
    label: item.label,
    sourceType: item.sourceType as "rss" | "url" | "site",
    sourceUrl: item.sourceUrl,
    isActive: item.isActive,
    autoImportEnabled: item.autoImportEnabled,
    preferredOutcome: item.preferredOutcome === "wordpress" ? "wordpress" : "threads",
    lastFetchedAt: item.lastFetchedAt?.toLocaleString("zh-TW", { hour12: false }) ?? "尚未刷新",
    lastItemTitle: item.lastItemTitle ?? "",
    lastItemUrl: item.lastItemUrl ?? "",
    lastExcerpt: item.lastExcerpt ?? "",
    lastHandledStatus: (item.lastHandledStatus as "new" | "imported" | "skipped" | null) ?? "new",
    lastError: item.lastError ?? ""
  }));

  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const recentAutopilotLogs = autopilotLogs.filter((log) => log.executedAt >= fourteenDaysAgo);
  const aiGeneratedToday = posts.filter((post) => post.status === "draft" && post.platform === "threads" && post.isFreshToday).length;
  const pendingApprovalCount = reviewFirstDraftPicks.length;
  const readyToShipCount = directPublishDraftPicks.length;
  const highValueSourceCount = inboxItems.filter((item) => item.qualityTier === "high" && item.status === "new").length;
  const missionTitle = settings?.missionTitle?.trim() || "7 個月內，讓接入帳號進入台灣前 50 大理財內容流量級";
  const missionCurrentValue = settings?.missionCurrentValue ?? 0;
  const missionTargetValue = settings?.missionTargetValue ?? 30000;
  const missionUnit = settings?.missionUnit?.trim() || "月自然流量";
  const missionProgress = missionTargetValue > 0 ? Math.min(100, Math.round((missionCurrentValue / missionTargetValue) * 1000) / 10) : 0;
  const missionDeadline = settings?.missionDeadline
    ? settings.missionDeadline.toLocaleDateString("zh-TW")
    : null;
  const missionStrategy = summarizeMissionStrategy({
    title: settings?.missionTitle,
    goal: settings?.editorialGoal,
    direction: settings?.editorialDirection,
    unit: settings?.missionUnit,
    currentValue: settings?.missionCurrentValue,
    targetValue: settings?.missionTargetValue
  });
  const autopilotModeLabel =
    settings?.autopilotMode === "review_only"
      ? "只進待拍板"
      : settings?.autopilotMode === "auto_schedule"
        ? "強稿自動排程"
        : "近乎全自動";
  const publishedIn14Days = posts.filter((post) => {
    const timestamp = new Date(post.scheduledAt).getTime();
    return post.status === "published" && !Number.isNaN(timestamp) && timestamp >= fourteenDaysAgo.getTime();
  }).length;
  const optimizationCreated14d = flywheelLogs.filter((log) => log.actionType === "optimization_flywheel" && log.status !== "failed" && log.executedAt >= fourteenDaysAgo).length;
  const wordpressExpanded14d = flywheelLogs.filter((log) => log.actionType === "auto_wordpress_expansion" && log.status !== "failed" && log.executedAt >= fourteenDaysAgo).length;
  const failedAutomationCount14d = [...recentAutopilotLogs, ...flywheelLogs.filter((log) => log.executedAt >= fourteenDaysAgo)].filter(
    (log) => log.status === "failed"
  ).length;
  const expiringAccountCount = accountSummaries.filter((account) => account.tokenStatus === "expiring").length;
  const interventionAlerts = [
    settings?.automationPaused
      ? {
          label: "自動化已暫停",
          detail: "站台目前是暫停狀態，系統不會自己繼續找題、排程或沉長文。",
          href: "/config",
          action: "去恢復"
        }
      : null,
    failedAutomationCount14d > 0
      ? {
          label: `14 天失敗任務 ${failedAutomationCount14d}`,
          detail: "有背景任務失敗，這是最值得你先看的例外，不然飛輪會有缺口。",
          href: "/factory",
          action: "看工廠紀錄"
        }
      : null,
    expiringAccountCount > 0
      ? {
          label: `Token 快到期 ${expiringAccountCount}`,
          detail: "有 Threads 帳號 token 即將到期，這是會直接影響自動發布的例外。",
          href: "/accounts",
          action: "去處理帳號"
        }
      : null,
    pendingApprovalCount > 0
      ? {
          label: `待拍板 ${pendingApprovalCount}`,
          detail: "這些稿件是系統還不想自己決定的內容，你只需要拍板這一層。",
          href: "/review",
          action: "去 Review"
        }
      : null,
    !settings?.editorialDirection?.trim()
      ? {
          label: "缺站台方向",
          detail: "沒有 editorial direction 時，系統雖然能自動跑，但 mission 會不夠聚焦。",
          href: "/config",
          action: "去補方向"
        }
      : null
  ].filter(Boolean) as Array<{ label: string; detail: string; href: string; action: string }>;
  const optimizationSnapshot = [
    { label: "14 天 autopilot 執行", value: String(recentAutopilotLogs.length), detail: "自動產文與排程補跑次數" },
    { label: "14 天已發布", value: String(publishedIn14Days), detail: "Threads 已完成發布的數量" },
    { label: "14 天優化稿", value: String(optimizationCreated14d), detail: "系統自動產出的舊文優化候選" },
    { label: "14 天沉長文", value: String(wordpressExpanded14d), detail: "系統自動送進 WordPress 的強表現內容" }
  ];

  const summaryCards = [
    { label: "高價值來源", value: String(highValueSourceCount), detail: "今天最值得先寫的來源數" },
    { label: "AI 今日產文", value: String(aiGeneratedToday), detail: "autopilot + AI 工廠新產出的草稿" },
    { label: "待你拍板", value: String(pendingApprovalCount), detail: "需要先進 Review 決定 assignment" },
    { label: "可直接發", value: String(readyToShipCount), detail: "高信心可直接最後確認的內容" },
    { label: "追蹤來源", value: String(trackedSources.length), detail: "固定觀察中的 RSS / URL / site 名單" }
  ];

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="PM Ops"
        title="先看 mission，再決定今天哪些內容值得被放大"
        description="這裡是唯一首頁。先看經營目標、今日待拍板與高價值來源，再把內容送進 Review、Compose、Threads 或 WordPress。"
      />

      <section className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <article className="rounded-[2rem] bg-[var(--card-dark)] p-6 text-white shadow-[0_24px_60px_rgba(15,10,7,0.22)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/55">PM Mission</p>
              <h2 className="mt-2 text-3xl font-semibold">{missionTitle}</h2>
              <p className="mt-3 text-sm text-white/72">
                {missionCurrentValue.toLocaleString("zh-TW")} / {missionTargetValue.toLocaleString("zh-TW")} {missionUnit}
                {missionDeadline ? ` · 截止 ${missionDeadline}` : ""}
              </p>
            </div>
            <div className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3 text-right">
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/55">Autopilot</p>
              <p className="mt-2 text-lg font-semibold">{autopilotModeLabel}</p>
              <p className="mt-1 text-xs text-white/60">{settings?.automationPaused ? "目前已暫停" : "目前允許背景自動運轉"}</p>
            </div>
          </div>
          <div className="mt-5 rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span>Mission 進度</span>
              <span>{missionProgress}%</span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-white" style={{ width: `${Math.max(6, missionProgress)}%` }} />
            </div>
            <p className="mt-3 text-sm text-white/68">
              {settings?.editorialDirection?.trim()
                ? `當前站台方向：${settings.editorialDirection.trim().slice(0, 110)}${settings.editorialDirection.trim().length > 110 ? "…" : ""}`
                : "目前尚未設定站台級內容方向，建議先去 Config / Accounts 補上 PM mission 與 editorial direction。"}
            </p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-[1.1rem] border border-white/10 bg-white/5 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/55">主軸</p>
              <p className="mt-2 text-sm leading-7 text-white/78">{missionStrategy.primaryFocus}</p>
            </div>
            <div className="rounded-[1.1rem] border border-white/10 bg-white/5 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/55">Threads 分流</p>
              <p className="mt-2 text-sm leading-7 text-white/78">{missionStrategy.threadBias}</p>
            </div>
            <div className="rounded-[1.1rem] border border-white/10 bg-white/5 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/55">WordPress / 優化</p>
              <p className="mt-2 text-sm leading-7 text-white/78">
                {missionStrategy.wordpressBias} {missionStrategy.optimizationBias}
              </p>
            </div>
          </div>
        </article>

        <article className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
          <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">14 Day Ops</p>
          <h2 className="mt-2 text-3xl font-semibold">寫文軌與優化軌</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {optimizationSnapshot.map((item) => (
              <article key={item.label} className="rounded-[1.3rem] border border-[var(--border)] bg-white/72 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{item.label}</p>
                <p className="mt-3 text-3xl font-semibold">{item.value}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">{item.detail}</p>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Operating Flow</p>
              <h2 className="mt-2 text-3xl font-semibold">每天就走這三步</h2>
            </div>
            <a href="/inventory" className="text-sm font-medium text-[var(--accent)]">
              去 Inventory
            </a>
          </div>
          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            {ONBOARDING_STEPS.map((step) => (
              <article key={step.label} className="rounded-[1.35rem] border border-[var(--border)] bg-white/74 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">{step.label}</p>
                <p className="mt-3 text-sm leading-7 text-[var(--foreground)]">{step.detail}</p>
                <a href={step.href} className="mt-4 inline-flex text-sm font-medium text-[var(--accent)]">
                  {step.action}
                </a>
              </article>
            ))}
          </div>
        </article>

        <article className="rounded-[2rem] bg-[var(--card-dark)] p-6 text-white shadow-[0_24px_60px_rgba(15,10,7,0.22)]">
          <p className="text-[11px] uppercase tracking-[0.3em] text-white/55">Operating Rule</p>
          <h2 className="mt-2 text-3xl font-semibold">先挑題，再讓系統幫你放大</h2>
          <div className="mt-5 space-y-3 text-sm text-white/78">
            <p className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3">
              來源先進 Inbox，先判斷值不值得寫，再進 Review / Compose。
            </p>
            <p className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3">
              Threads 先驗證，WordPress 後沉澱。長文不是起點，是知識沉澱與商業位承接。
            </p>
            <p className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3">
              AI 負責找題、起稿、優化與背景自動化；你主要處理 mission、例外與高價值決策。
            </p>
          </div>
        </article>
      </section>

      <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-5">
        <div className="mb-4 flex justify-end">
          <AutopilotHeartbeat compact />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <article key={card.label} className="metric-card">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">{card.label}</p>
              <p className="mt-3 text-3xl font-semibold">{card.value}</p>
              <p className="mt-2 text-sm text-[var(--muted)]">{card.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="glass-panel rounded-[2rem] border border-[var(--border)] p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Exception Desk</p>
              <h2 className="mt-2 text-3xl font-semibold">你只要介入這幾件事</h2>
            </div>
            <Link href="/review" className="text-sm font-medium text-[var(--accent)]">
              去拍板台
            </Link>
          </div>
          <div className="mt-5 space-y-3">
            {interventionAlerts.length ? (
              interventionAlerts.map((item) => (
                <article key={item.label} className="rounded-[1.35rem] border border-[var(--border)] bg-white/78 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold">{item.label}</p>
                      <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{item.detail}</p>
                    </div>
                    <a href={item.href} className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm">
                      {item.action}
                    </a>
                  </div>
                </article>
              ))
            ) : (
              <article className="rounded-[1.35rem] border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)]">
                目前沒有明顯例外。系統可以繼續自動找題、寫文、排程、沉長文，你只要定期看 Review 就好。
              </article>
            )}
          </div>
        </article>

        <article className="rounded-[2rem] bg-[var(--card-dark)] p-5 text-white shadow-[0_24px_60px_rgba(15,10,7,0.22)]">
          <p className="text-[11px] uppercase tracking-[0.3em] text-white/55">Hands-Off Rule</p>
          <h2 className="mt-2 text-3xl font-semibold">你不是每天來操作，你是來處理例外</h2>
          <div className="mt-5 space-y-3 text-sm text-white/78">
            <p className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3">
              正常情況下，系統會自己找題、產稿、排程與沉長文；你不需要每天進來點每一篇。
            </p>
            <p className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3">
              只有當 token、mission、失敗任務或待拍板稿件出現時，才代表有值得你介入的地方。
            </p>
            <p className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3">
              這一塊就是站台的例外面板。沒有例外時，放著讓系統跑，回頭看數字就好。
            </p>
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <article className="glass-panel rounded-[2rem] border border-[var(--border)] p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Operating Snapshot</p>
              <h2 className="mt-2 text-3xl font-semibold">把原本總覽真正收進 Desk</h2>
            </div>
            <a href="/analytics" className="text-sm font-medium text-[var(--accent)]">
              看完整分析
            </a>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {operatingSnapshot.map((item) => (
              <article key={item.label} className="rounded-[1.4rem] border border-[var(--border)] bg-white/72 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">{item.label}</p>
                <p className="mt-3 text-3xl font-semibold">{item.value}</p>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{item.detail}</p>
              </article>
            ))}
          </div>
        </article>

        <article className="rounded-[2rem] bg-[var(--card-dark)] p-5 text-white shadow-[0_24px_60px_rgba(15,10,7,0.22)]">
          <p className="text-[11px] uppercase tracking-[0.3em] text-white/55">Current System</p>
          <h2 className="mt-2 text-3xl font-semibold">現在正在運轉的主控台</h2>
          <div className="mt-5 space-y-3 text-sm text-white/78">
            <p className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3">
              Desk 現在就是唯一首頁。原本的 Dashboard 只保留轉址，不再維持第二套入口。
            </p>
            <p className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3">
              先看總覽與題目，再進 Review Workspace、Compose、Queue，不再一開始就掉進發文表單。
            </p>
            <p className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3">
              WordPress 仍只做長文沉澱草稿台，Threads 才是每日主控發佈面。
            </p>
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {[
          {
            label: "快節奏新聞題",
            title: "台股 / 美股 / 宏觀快評",
            detail: "先從高可寫來源挑一篇正文訊號強的新聞，讓 AI 起一版 Threads，再決定要不要延伸成長文。",
            href: "/desk?tab=inbox"
          },
          {
            label: "深度文章題",
            title: "部落格 / 研究站正文拆解",
            detail: "遇到沒有 RSS 的站，就交給網站模式先抓文章本體，再把它正規化後改寫成你的觀點。",
            href: "/desk?tab=sources"
          },
          {
            label: "長期知識題",
            title: "YouTube / podcast / 自有筆記",
            detail: "這條比較像知識沉澱，不急著日更。後面會接 transcript ingestion，先把方向收在 Help 裡。",
            href: "/help?topic=knowledge-inputs"
          }
        ].map((lane) => (
          <article key={lane.title} className="glass-panel rounded-[2rem] border border-[var(--border)] p-5">
            <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">{lane.label}</p>
            <h2 className="mt-2 text-2xl font-semibold">{lane.title}</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{lane.detail}</p>
            <a href={lane.href} className="mt-4 inline-flex text-sm font-medium text-[var(--accent)]">
              打開這條輸入路徑
            </a>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <article className="glass-panel rounded-[2rem] border border-[var(--border)] p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Rewrite Radar</p>
              <h2 className="mt-2 text-3xl font-semibold">最近值得重寫的 Threads</h2>
            </div>
            <a href="/analytics" className="text-sm font-medium text-[var(--accent)]">
              看完整分析
            </a>
          </div>
          <div className="mt-5 space-y-3">
            {analytics.viralCandidates.slice(0, 3).map((post) => (
              <article key={post.id} className="rounded-[1.5rem] border border-[var(--border)] bg-white/72 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{post.account}</p>
                  <span
                    className={`rounded-full px-3 py-1 text-xs uppercase ${
                      post.label === "high"
                        ? "bg-emerald-100 text-emerald-700"
                        : post.label === "medium"
                          ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                          : "bg-stone-200 text-stone-700"
                    }`}
                  >
                    {post.label} · {post.score}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7">{post.text}</p>
                <p className="mt-3 text-sm text-[var(--muted)]">{post.suggestion}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a href={`/posts/${post.id}`} className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm">
                    看復盤
                  </a>
                  <a href={`/compose?reviewId=${post.id}`} className="rounded-full bg-[var(--card-dark)] px-4 py-2 text-sm text-white">
                    直接開新稿
                  </a>
                </div>
              </article>
            ))}
            {analytics.viralCandidates.length === 0 ? (
              <article className="rounded-[1.5rem] border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)]">
                目前還沒有足夠的 Threads metrics 可判斷下一篇該重寫哪一則。
              </article>
            ) : null}
          </div>
        </article>

        <article className="rounded-[2rem] bg-[var(--card-dark)] p-5 text-white shadow-[0_24px_60px_rgba(15,10,7,0.22)]">
          <p className="text-[11px] uppercase tracking-[0.3em] text-white/55">Desk Focus</p>
          <h2 className="mt-2 text-3xl font-semibold">今天先做什麼</h2>
          <div className="mt-5 space-y-3 text-sm text-white/78">
            <p className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3">
              1. 先看 `Rewrite Radar`，挑一篇最近值得延伸的 Threads。
            </p>
            <p className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3">
              2. 去 `Inbox` 看有沒有新來源值得併進同一個主題。
            </p>
            <p className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3">
              3. 回 `Engine` 或 `Queue` 補成 Threads / WordPress draft。
            </p>
          </div>
          <div className="mt-5 flex flex-wrap gap-2 text-sm">
            <a href="/desk?tab=inbox" className="rounded-full border border-white/15 px-4 py-2 text-white">
              去 Inbox
            </a>
            <a href="/desk?tab=queue" className="rounded-full border border-white/15 px-4 py-2 text-white">
              去 Queue
            </a>
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
        <article className="glass-panel rounded-[2rem] border border-[var(--border)] p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Inbox Signals</p>
              <h2 className="mt-2 text-3xl font-semibold">今天先確認的文章來源</h2>
            </div>
            <a href="/desk?tab=inbox" className="text-sm font-medium text-[var(--accent)]">
              去 Inbox
            </a>
          </div>
          <div className="mt-5 space-y-3">
            {topInboxSignals.map((item) => (
              <article key={item.id} className="rounded-[1.5rem] border border-[var(--border)] bg-white/72 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                    {item.label} · {item.sourceType}
                  </p>
                  <span
                    className={`rounded-full px-3 py-1 text-xs ${
                      item.qualityTier === "high"
                        ? "bg-emerald-100 text-emerald-700"
                        : item.qualityTier === "watch"
                          ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                          : "bg-stone-200 text-stone-700"
                    }`}
                  >
                    {item.qualityLabel}
                  </span>
                </div>
                <p className="mt-3 text-sm font-medium leading-7">{item.title}</p>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{item.excerpt}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-sm">
                  <span className="rounded-full bg-white px-4 py-2">Threads {item.threadsScore}</span>
                  <span className="rounded-full bg-white px-4 py-2">WordPress {item.wordpressScore}</span>
                  <span className="rounded-full bg-white px-4 py-2">商業潛力 {item.commercialScore}</span>
                </div>
                {item.reasons.length ? (
                  <p className="mt-3 rounded-[1.1rem] border border-[var(--border)] bg-[rgba(255,252,248,0.9)] px-4 py-3 text-sm leading-7 text-[var(--accent-strong)]">
                    {item.reasons[0]}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <a href="/desk?tab=inbox" className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm">
                    去確認
                  </a>
                  <a href={item.url} target="_blank" rel="noreferrer" className="rounded-full bg-[var(--card-dark)] px-4 py-2 text-sm text-white">
                    看原文
                  </a>
                </div>
              </article>
            ))}
            {topInboxSignals.length === 0 ? (
              <article className="rounded-[1.5rem] border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)]">
                今天還沒有新的高訊號來源。可以先去 `Sources` 刷來源，或等自動刷新下一輪。
              </article>
            ) : null}
          </div>
        </article>

        <article className="rounded-[2rem] bg-[var(--card-dark)] p-5 text-white shadow-[0_24px_60px_rgba(15,10,7,0.22)]">
          <p className="text-[11px] uppercase tracking-[0.3em] text-white/55">Signal Rule</p>
          <h2 className="mt-2 text-3xl font-semibold">先看品質，再決定先寫哪篇</h2>
          <div className="mt-5 space-y-3 text-sm text-white/78">
            <p className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3">
              `高可寫` 代表這篇來源很適合直接拆成 Threads 或長文，不要拖。
            </p>
            <p className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3">
              `可觀察` 代表還有訊號，但值得先看來源理由，再決定是不是今天的主題。
            </p>
            <p className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3">
              `低訊號` 不一定沒價值，只是先別佔掉今天的主要發文位置。
            </p>
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
        <article className="glass-panel rounded-[2rem] border border-[var(--border)] p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Today Draft Picks</p>
              <h2 className="mt-2 text-3xl font-semibold">今天為什麼是這幾篇</h2>
            </div>
            <a href="/desk?tab=queue" className="text-sm font-medium text-[var(--accent)]">
              去 Queue
            </a>
          </div>
          <div className="mt-5 space-y-5">
            {directPublishDraftPicks.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">今天可直接發</p>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-700">
                    {directPublishDraftPicks.length} 篇
                  </span>
                </div>
                {directPublishDraftPicks.map((post) => (
                  <article key={post.id} className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                        {post.personaLabel || post.account}
                      </p>
                      {post.reviewScore ? (
                        <span className="rounded-full bg-white px-3 py-1 text-xs text-[var(--foreground)]">
                          精選分數 {post.reviewScore}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm font-medium leading-7">{post.title ?? post.text}</p>
                    {post.candidateRationale ? (
                      <p className="mt-3 rounded-[1.1rem] border border-emerald-200 bg-white/90 px-4 py-3 text-sm leading-7 text-[var(--accent-strong)]">
                        {post.candidateRationale}
                      </p>
                    ) : null}
                    {post.laneReason ? (
                      <p className="mt-3 rounded-[1.1rem] border border-emerald-200 bg-white/90 px-4 py-3 text-sm leading-7 text-[var(--muted)]">
                        {post.laneReason}
                      </p>
                    ) : null}
                    {(post.suggestedScheduleLabel || post.suggestedCta) ? (
                      <div className="mt-3 flex flex-wrap gap-2 text-sm">
                        {post.suggestedScheduleLabel ? (
                          <span className="rounded-full bg-white px-4 py-2">建議時段 {post.suggestedScheduleLabel}</span>
                        ) : null}
                        {post.suggestedCta ? (
                          <span className="rounded-full bg-white px-4 py-2">建議 CTA：{post.suggestedCta}</span>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <a href="/desk?tab=queue" className="rounded-full bg-[var(--card-dark)] px-4 py-2 text-sm text-white">
                        去 Queue 直接發
                      </a>
                      <a href={`/review/${post.id}`} className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm">
                        進確認區
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}

            {reviewFirstDraftPicks.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">今天先看一下</p>
                  <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs text-[var(--foreground)]">
                    {reviewFirstDraftPicks.length} 篇
                  </span>
                </div>
                {reviewFirstDraftPicks.map((post) => (
                  <article key={post.id} className="rounded-[1.5rem] border border-[var(--border)] bg-white/72 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                        {post.personaLabel || post.account}
                      </p>
                      {post.reviewScore ? (
                        <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs text-[var(--foreground)]">
                          精選分數 {post.reviewScore}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm font-medium leading-7">{post.title ?? post.text}</p>
                    {post.candidateRationale ? (
                      <p className="mt-3 rounded-[1.1rem] border border-[var(--border)] bg-[rgba(255,252,248,0.9)] px-4 py-3 text-sm leading-7 text-[var(--accent-strong)]">
                        {post.candidateRationale}
                      </p>
                    ) : (
                      <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                        這篇目前沒有來源理由摘要，但因為分數和新鮮度較高，仍被排在今日候選前段。
                      </p>
                    )}
                    {post.laneReason ? (
                      <p className="mt-3 rounded-[1.1rem] border border-[var(--border)] bg-white/86 px-4 py-3 text-sm leading-7 text-[var(--muted)]">
                        {post.laneReason}
                      </p>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <a href={`/review/${post.id}`} className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm">
                        進確認區
                      </a>
                      <a href="/desk?tab=queue" className="rounded-full bg-[var(--card-dark)] px-4 py-2 text-sm text-white">
                        去 Queue 決定
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}

            {todayDraftPicks.length === 0 ? (
              <article className="rounded-[1.5rem] border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)]">
                今天還沒有新的 Threads 候選稿。可以先去 `Sources` 刷一輪，或手動跑 persona autopilot。
              </article>
            ) : null}
          </div>
        </article>

        <article className="rounded-[2rem] bg-[var(--card-dark)] p-5 text-white shadow-[0_24px_60px_rgba(15,10,7,0.22)]">
          <p className="text-[11px] uppercase tracking-[0.3em] text-white/55">Reading Rule</p>
          <h2 className="mt-2 text-3xl font-semibold">先看理由，再決定要不要發</h2>
          <div className="mt-5 space-y-3 text-sm text-white/78">
            <p className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3">
              如果來源理由很清楚，代表這篇草稿是承接最近文章或市場訊號，不只是 AI 空寫。
            </p>
            <p className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3">
              如果你一看就覺得理由不成立，先不要發，回 Sources 或 Inbox 再挑一題。
            </p>
            <p className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3">
              目標不是每天發最多，而是每天先挑出最有根據的 2 到 3 篇。
            </p>
          </div>
        </article>
      </section>

      <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-5">
        <div className="flex flex-wrap gap-2">
          {DESK_TABS.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <a
                key={tab.id}
                href={`/desk?tab=${tab.id}`}
                className={`rounded-full px-4 py-2 text-sm ${
                  isActive ? "bg-[var(--card-dark)] text-white" : "border border-[var(--border)] bg-white/72 text-[var(--foreground)]"
                }`}
              >
                {tab.label}
              </a>
            );
          })}
        </div>
        <div className="mt-4 rounded-[1.4rem] border border-[var(--border)] bg-white/72 px-4 py-3">
          <p className="text-sm text-[var(--muted)]">{DESK_TABS.find((tab) => tab.id === activeTab)?.description}</p>
        </div>
      </section>

      {activeTab === "overview" ? (
        <div className="grid gap-4 xl:grid-cols-[1.04fr_0.96fr]">
          <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-[var(--muted)]">先從總覽確認今天最值得處理的文章，再決定要不要發、排程，或沉到長文。</p>
                <p className="mt-1 text-xs text-[var(--muted)]">這裡預設就是你每天打開後第一眼該看的確認台。</p>
              </div>
              <QueueActions />
            </div>
            <PostsList posts={posts} />
          </section>

          <div className="space-y-4">
            <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Connected Accounts</p>
                  <h2 className="mt-2 text-2xl font-semibold">目前有哪些主控帳號</h2>
                </div>
                <a href="/accounts" className="text-sm font-medium text-[var(--accent)]">
                  管理帳號
                </a>
              </div>
              <div className="mt-5 space-y-3">
                {accountSummaries.slice(0, 4).map((account) => (
                  <article key={account.id} className="rounded-[1.35rem] border border-[var(--border)] bg-white/72 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{account.username}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">{account.personaLabel || "未命名 persona"}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs ${account.tokenStatus === "healthy" ? "bg-emerald-100 text-emerald-700" : "bg-[var(--accent-soft)] text-[var(--accent-strong)]"}`}>
                        {account.tokenStatus === "healthy" ? "Ready" : "Expiring"}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-sm">
                      <span className="rounded-full bg-white px-4 py-2">Followers {account.followers}</span>
                      <span className="rounded-full bg-white px-4 py-2">Views {account.weeklyViews}</span>
                    </div>
                  </article>
                ))}
                {accountSummaries.length === 0 ? (
                  <article className="rounded-[1.35rem] border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)]">
                    目前還沒有 Threads 帳號，先去 Accounts 完成授權。
                  </article>
                ) : null}
              </div>
            </section>

            <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Keyword Signals</p>
                  <h2 className="mt-2 text-2xl font-semibold">最近掃到的關鍵字訊號</h2>
                </div>
                <a href="/keywords" className="text-sm font-medium text-[var(--accent)]">
                  看全部
                </a>
              </div>
              <div className="mt-5 space-y-3">
                {keywordHits.slice(0, 4).map((hit) => (
                  <article key={hit.id} className="rounded-[1.35rem] border border-[var(--border)] bg-white/72 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">{hit.keyword}</p>
                      <span className="rounded-full bg-white px-3 py-1 text-xs text-[var(--foreground)]">{hit.actionTaken}</span>
                    </div>
                    <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{hit.author}</p>
                    <p className="mt-2 text-sm leading-7 text-[var(--accent-strong)]">{hit.excerpt}</p>
                  </article>
                ))}
                {keywordHits.length === 0 ? (
                  <article className="rounded-[1.35rem] border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)]">
                    目前還沒有新的關鍵字命中，可以先專注在來源與候選稿。
                  </article>
                ) : null}
              </div>
            </section>
          </div>
        </div>
      ) : null}

      {activeTab === "inbox" ? <SourceInbox initialItems={inboxItems} /> : null}

      {activeTab === "sources" ? <SourceWatchlist initialItems={trackedSources} /> : null}

      {activeTab === "engine" ? (
        <ContentEngineForm
          initialPersonaPrompt={settings?.globalPersonaPrompt ?? "像一位冷靜但有觀點的內容策略師，幫我把素材整理成可發佈版本。"}
          initialTone={settings?.defaultTone ?? "sharp-observer"}
          initialAiProvider={(settings?.aiProvider as "auto" | "gemini" | "claude" | "openai" | undefined) ?? "auto"}
          threadsAccounts={threadsAccounts.map((account) => ({
            id: account.id,
            username: `@${account.platformUsername}`,
            personaLabel: account.personaLabel ?? "",
            personaPrompt: account.personaPrompt ?? "",
            defaultTone: account.defaultTone ?? "",
            topicFocus: account.topicFocus ?? "",
            hookStyle: account.hookStyle ?? "",
            ctaStyle: account.ctaStyle ?? "",
            voiceGuardrails: account.voiceGuardrails ?? ""
          }))}
          recentIngestions={ingestions.map((item) => ({
            id: item.id,
            sourceType: item.sourceType,
            title: item.title ?? "未命名素材",
            createdAt: item.createdAt.toLocaleString("zh-TW", { hour12: false }),
            generatedCount: item.generatedPostIds ? (JSON.parse(item.generatedPostIds) as string[]).length : 0
          }))}
          recentDrafts={drafts.map((draft) => ({
            id: draft.id,
            platform: draft.account.platform,
            title: draft.title ?? draft.textContent ?? "未命名草稿",
            status: draft.status,
            href: draft.account.platform === "threads" ? `/review/${draft.id}` : `/compose?postId=${draft.id}`
          }))}
        />
      ) : null}

      {activeTab === "queue" ? (
        <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-[var(--muted)]">排程由 Inngest 每分鐘觸發一次 scheduler function。</p>
              <p className="mt-1 text-xs text-[var(--muted)]">WordPress 草稿不會自動發布；Threads 排程若沒接上 `/api/inngest` 才會停在 `scheduled`。</p>
            </div>
            <QueueActions />
          </div>
          <PostsList posts={posts} />
        </section>
      ) : null}
    </div>
  );
}
