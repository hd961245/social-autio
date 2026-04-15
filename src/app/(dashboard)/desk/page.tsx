import { ContentEngineForm } from "@/components/dashboard/content-engine-form";
import { PageIntro } from "@/components/dashboard/page-intro";
import { PostsList } from "@/components/dashboard/posts-list";
import { SourceInbox } from "@/components/dashboard/source-inbox";
import { SourceWatchlist } from "@/components/dashboard/source-watchlist";
import { getAnalyticsOverview, getPostSummaries } from "@/lib/dashboard-data";
import { scoreSourceItem } from "@/lib/content/source-inbox";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DESK_TABS = [
  { id: "inbox", label: "Inbox", description: "先看今天值得處理的來源內容" },
  { id: "sources", label: "Sources", description: "管理固定追蹤來源與刷新名單" },
  { id: "engine", label: "Engine", description: "把素材拆成 Threads + WordPress 草稿" },
  { id: "queue", label: "Queue", description: "編修草稿、排程與查看發布紀錄" }
] as const;

type DeskTab = (typeof DESK_TABS)[number]["id"];

export default async function DeskPage({
  searchParams
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const activeTab: DeskTab = DESK_TABS.some((tab) => tab.id === params.tab) ? (params.tab as DeskTab) : "inbox";

  let sourceItems: Awaited<ReturnType<typeof prisma.sourceWatch.findMany>> = [];
  let settings: Awaited<ReturnType<typeof prisma.appSettings.findFirst>> = null;
  let ingestions: Awaited<ReturnType<typeof prisma.ingestionRecord.findMany>> = [];
  let drafts: Array<
    Awaited<ReturnType<typeof prisma.post.findMany<{ include: { account: true } }>>>[number]
  > = [];
  const posts = await getPostSummaries();
  const analytics = await getAnalyticsOverview({ window: "30d", accountId: "all" });

  try {
    [sourceItems, settings, ingestions, drafts] = await Promise.all([
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

      return {
        id: item.id,
        label: item.label,
        sourceType: item.sourceType as "rss" | "url",
        lastFetchedAt: item.lastFetchedAt?.toLocaleString("zh-TW", { hour12: false }) ?? "尚未刷新",
        title: item.lastItemTitle ?? "未命名來源內容",
        url: item.lastItemUrl ?? item.sourceUrl,
        excerpt: item.lastExcerpt ?? "",
        status: (item.lastHandledStatus as "new" | "imported" | "skipped" | null) ?? "new",
        threadsScore: score.threadsScore,
        wordpressScore: score.wordpressScore,
        commercialScore: score.commercialScore,
        recommendation: score.recommendation,
        reasons: score.reasons,
        memoryNote: score.memoryNote
      };
    });

  const trackedSources = sourceItems.map((item) => ({
    id: item.id,
    label: item.label,
    sourceType: item.sourceType as "rss" | "url",
    sourceUrl: item.sourceUrl,
    isActive: item.isActive,
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
        title="內容工作台"
        description="把看來源、選題改寫、生成草稿、回到 Queue 續修這條線收在同一頁。平常只要從這裡進，就不用在四五個頁面來回切。"
      />

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

      {activeTab === "inbox" ? <SourceInbox initialItems={inboxItems} /> : null}

      {activeTab === "sources" ? <SourceWatchlist initialItems={trackedSources} /> : null}

      {activeTab === "engine" ? (
        <ContentEngineForm
          initialPersonaPrompt={settings?.globalPersonaPrompt ?? "像一位冷靜但有觀點的內容策略師，幫我把素材整理成可發佈版本。"}
          initialTone={settings?.defaultTone ?? "sharp-observer"}
          initialAiProvider={(settings?.aiProvider as "auto" | "gemini" | "claude" | "openai" | undefined) ?? "auto"}
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
            <div className="flex gap-3">
              <form action="/api/cron/scheduler" method="post">
                <button className="rounded-full border border-[var(--border-strong)] bg-white/70 px-4 py-2 text-sm">
                  立即執行排程
                </button>
              </form>
              <a href="/compose" className="rounded-full border border-[var(--border-strong)] bg-white/70 px-4 py-2 text-sm">
                建立新貼文
              </a>
            </div>
          </div>
          <PostsList posts={posts} />
        </section>
      ) : null}
    </div>
  );
}
