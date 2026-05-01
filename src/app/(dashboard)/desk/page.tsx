import { ContentEngineForm } from "@/components/dashboard/content-engine-form";
import { PageIntro } from "@/components/dashboard/page-intro";
import { PostsList } from "@/components/dashboard/posts-list";
import { QueueActions } from "@/components/dashboard/queue-actions";
import { SourceInbox } from "@/components/dashboard/source-inbox";
import { SourceWatchlist, type SourceItem as SourceWatchItem } from "@/components/dashboard/source-watchlist";
import { getAnalyticsOverview, getPostSummaries } from "@/lib/dashboard-data";
import { classifySourceKnowledgeLane, routeSourceToPersona, scoreSourceItem } from "@/lib/content/source-inbox";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DESK_TABS = [
  { id: "overview", label: "總覽", description: "先看今天題目、候選稿與工作焦點" },
  { id: "inbox", label: "Inbox", description: "先看今天值得處理的來源內容" },
  { id: "sources", label: "來源", description: "管理固定追蹤來源與刷新名單" },
  { id: "engine", label: "AI 起稿", description: "把素材拆成 Threads + WordPress 草稿" },
  { id: "queue", label: "Queue", description: "編修草稿、排程與查看發布紀錄" }
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
  let drafts: Array<
    Awaited<ReturnType<typeof prisma.post.findMany<{ include: { account: true } }>>>[number]
  > = [];
  const posts = await getPostSummaries();
  const analytics = await getAnalyticsOverview({ window: "30d", accountId: "all" });
  const todayDraftPicks = posts
    .filter((post) => post.platform === "threads" && post.status === "draft" && post.isFreshToday)
    .sort((left, right) => (right.reviewScore ?? 0) - (left.reviewScore ?? 0))
    .slice(0, 3);

  try {
    [sourceItems, settings, ingestions, drafts, threadsAccounts] = await Promise.all([
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

  const summaryCards = [
    { label: "待處理來源", value: String(inboxItems.filter((item) => item.status === "new").length), detail: "今天還沒處理的來源內容" },
    { label: "追蹤來源", value: String(trackedSources.length), detail: "固定觀察中的 RSS / URL 名單" },
    { label: "最近輸入", value: String(ingestions.length), detail: "最近一次進 Content Engine 的素材" },
    { label: "可編輯草稿", value: String(posts.filter((post) => post.status === "draft").length), detail: "Threads + WordPress 尚待細修" }
  ];

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Content Desk"
        title="今天先在這裡決定要寫什麼"
        description="Desk 只做一件事：幫你先確認今天最值得寫的題目，再把你送去 Compose、Queue 或 WordPress。"
      />

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Daily Flow</p>
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
              來源先進 Inbox，先判斷值不值得寫，再進 Compose。
            </p>
            <p className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3">
              Threads 先驗證，WordPress 後沉澱。長文不是起點。
            </p>
            <p className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3">
              AI 是起稿助手，不是代替你決定今天主題的人。
            </p>
          </div>
        </article>
      </section>

      <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-5">
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
          <div className="mt-5 space-y-3">
            {todayDraftPicks.map((post) => (
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
                <div className="mt-4 flex flex-wrap gap-2">
                  <a href={`/compose?postId=${post.id}`} className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm">
                    打開草稿
                  </a>
                  <a href="/desk?tab=queue" className="rounded-full bg-[var(--card-dark)] px-4 py-2 text-sm text-white">
                    去 Queue 決定
                  </a>
                </div>
              </article>
            ))}
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
            href: `/compose?postId=${draft.id}`
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
