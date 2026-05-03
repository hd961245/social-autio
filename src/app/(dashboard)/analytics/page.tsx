import { DatabaseBanner } from "@/components/dashboard/database-banner";
import { PageIntro } from "@/components/dashboard/page-intro";
import { getAnalyticsOverview, getDatabaseStatus } from "@/lib/dashboard-data";
import { getGaOverview } from "@/lib/ga";
import { getGscOverview } from "@/lib/gsc";

export const dynamic = "force-dynamic";

const WINDOW_OPTIONS = [
  { id: "7d", label: "7天" },
  { id: "30d", label: "30天" },
  { id: "all", label: "全部" }
] as const;

export default async function AnalyticsPage({
  searchParams
}: {
  searchParams: Promise<{ window?: string; accountId?: string }>;
}) {
  const params = await searchParams;
  const window = params.window === "7d" || params.window === "30d" || params.window === "all" ? params.window : "30d";
  const accountId = params.accountId ?? "all";
  const [databaseStatus, analytics, gaOverview, gscOverview] = await Promise.all([
    getDatabaseStatus(),
    getAnalyticsOverview({ window, accountId }),
    getGaOverview().catch((error) => ({
      configured: false,
      propertyId: "",
      source: "ga4",
      totals: {
        activeUsers: 0,
        newUsers: 0,
        sessions: 0,
        screenPageViews: 0
      },
      topPages: [],
      message: error instanceof Error ? error.message : "GA4 讀取失敗"
    })),
    getGscOverview().catch((error) => ({
      configured: false,
      siteUrl: "",
      source: "gsc",
      totals: {
        clicks: 0,
        impressions: 0,
        ctr: 0,
        position: 0
      },
      topPages: [],
      topQueries: [],
      message: error instanceof Error ? error.message : "GSC 讀取失敗"
    }))
  ]);
  const bestPost = analytics.topPosts[0] ?? null;
  const strongestCandidate = analytics.viralCandidates[0] ?? null;
  const compactSnapshots = analytics.followerTrend.slice(-7).reverse();
  const totalCards = [
    { label: "Views", value: analytics.totals.views },
    { label: "Likes", value: analytics.totals.likes },
    { label: "Replies", value: analytics.totals.replies },
    { label: "Reposts", value: analytics.totals.reposts },
    { label: "Quotes", value: analytics.totals.quotes },
    { label: "Shares", value: analytics.totals.shares }
  ];

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Analytics"
        title="Threads 復盤板"
        description="這裡把 Threads、GA4、Search Console 收成同一塊營運面。只保留對決策有用的數字、排名與下一步建議。"
      />
      <DatabaseBanner status={databaseStatus} />

      <section className="glass-panel rounded-[1.8rem] border border-[var(--border)] p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Filters</p>
            <h2 className="mt-2 text-2xl font-semibold">切你現在要看的區間</h2>
          </div>
          <form className="grid gap-3 sm:grid-cols-[1fr_180px] xl:w-[520px]">
            <input type="hidden" name="window" value={analytics.filters.window} />
            <select
              name="accountId"
              defaultValue={analytics.filters.accountId}
              className="rounded-[1rem] border border-[var(--border)] bg-white/80 px-4 py-3 text-sm outline-none"
            >
              {analytics.filters.accountOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <button className="rounded-full bg-[var(--accent)] px-4 py-3 text-sm text-white">切換帳號</button>
          </form>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {WINDOW_OPTIONS.map((option) => {
            const isActive = analytics.filters.window === option.id;
            const href = `/analytics?window=${option.id}&accountId=${analytics.filters.accountId}`;

            return (
              <a
                key={option.id}
                href={href}
                className={`rounded-full px-4 py-2 text-sm ${
                  isActive
                    ? "bg-[var(--card-dark)] text-white"
                    : "border border-[var(--border)] bg-white/70 text-[var(--foreground)]"
                }`}
              >
                {option.label}
              </a>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="glass-panel rounded-[1.6rem] border border-[var(--border)] p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Publishing Quota</p>
          <p className="mt-3 text-4xl font-semibold">
            {analytics.quota.used} / {analytics.quota.limit}
          </p>
          <p className="mt-3 text-sm text-[var(--muted)]">24 小時內已用配額與上限</p>
        </article>
        <article className="glass-panel rounded-[1.6rem] border border-[var(--border)] p-5 lg:col-span-2">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Token Health</p>
          <p className="mt-3 text-lg font-semibold">
            {analytics.tokenWarning ?? "目前沒有即將到期的 token 警示"}
          </p>
          <p className="mt-3 text-sm text-[var(--muted)]">cron metrics route 也會順手刷新 7 天內到期的 token</p>
        </article>
      </section>

      <section className="glass-panel rounded-[1.8rem] border border-[var(--border)] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Traffic Layer</p>
            <h2 className="mt-3 text-3xl font-semibold">站台流量總覽</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
              GA4 看整站，Search Console 看自然搜尋。這裡先回答流量有沒有在往「台灣前 50 大理財帳號」的方向推進。
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.2rem] border border-[var(--border)] bg-white/70 px-4 py-3 text-sm">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">GA4</p>
              <p className="mt-2 font-semibold">{gaOverview.propertyId || "未設定"}</p>
              <p className="mt-2 text-xs text-[var(--muted)]">{gaOverview.configured ? "已連線" : "尚未接好"}</p>
            </div>
            <div className="rounded-[1.2rem] border border-[var(--border)] bg-white/70 px-4 py-3 text-sm">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">GSC</p>
              <p className="mt-2 font-semibold">{gscOverview.siteUrl || "未設定"}</p>
              <p className="mt-2 text-xs text-[var(--muted)]">{gscOverview.configured ? "已連線" : "尚未接好"}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Active Users", value: gaOverview.totals.activeUsers },
            { label: "New Users", value: gaOverview.totals.newUsers },
            { label: "Sessions", value: gaOverview.totals.sessions },
            { label: "Page Views", value: gaOverview.totals.screenPageViews }
          ].map((card) => (
            <article key={card.label} className="metric-card">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">{card.label}</p>
              <p className="mt-3 text-3xl font-semibold">{card.value}</p>
              <p className="mt-2 text-sm text-[var(--muted)]">近 30 天 GA4 站點總量</p>
            </article>
          ))}
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          <article className="rounded-[1.5rem] border border-[var(--border)] bg-white/72 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">GA4 Top Pages</p>
            <div className="mt-4 max-h-[18rem] space-y-3 overflow-y-auto pr-1">
              {gaOverview.topPages.length ? (
                gaOverview.topPages.map((page) => (
                  <div key={page.path} className="flex items-center justify-between gap-3 rounded-[1.1rem] border border-[var(--border)] bg-[rgba(255,252,248,0.82)] px-4 py-3">
                    <p className="min-w-0 flex-1 truncate text-sm font-medium">{page.path}</p>
                    <div className="text-right text-sm">
                      <p>{page.views} views</p>
                      <p className="text-[var(--muted)]">{page.users} users</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--muted)]">{gaOverview.message}</p>
              )}
            </div>
          </article>

          <article className="rounded-[1.5rem] border border-[var(--border)] bg-white/72 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Search Console</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                { label: "Clicks", value: gscOverview.totals.clicks },
                { label: "Impressions", value: gscOverview.totals.impressions },
                { label: "CTR", value: `${(gscOverview.totals.ctr * 100).toFixed(1)}%` },
                { label: "Avg Position", value: gscOverview.totals.position ? gscOverview.totals.position.toFixed(1) : "0.0" }
              ].map((card) => (
                <div key={card.label} className="rounded-[1.1rem] border border-[var(--border)] bg-[rgba(255,252,248,0.82)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{card.label}</p>
                  <p className="mt-2 text-2xl font-semibold">{card.value}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 break-all text-sm leading-7 text-[var(--muted)]">{gscOverview.message}</p>
          </article>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="glass-panel rounded-[1.8rem] border border-[var(--border)] p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Top Queries</p>
          <h2 className="mt-3 text-3xl font-semibold">最近自然搜尋在吃什麼</h2>
          <div className="mt-5 max-h-[18rem] space-y-3 overflow-y-auto pr-1">
            {gscOverview.topQueries.length ? (
              gscOverview.topQueries.map((query) => (
                <article key={query.query} className="rounded-[1.3rem] border border-[var(--border)] bg-white/72 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 flex-1 text-sm font-medium">{query.query}</p>
                    <div className="text-right text-sm">
                      <p>{query.clicks} clicks</p>
                      <p className="text-[var(--muted)]">{query.impressions} impressions</p>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <p className="text-sm text-[var(--muted)]">{gscOverview.message}</p>
            )}
          </div>
        </article>

        <article className="glass-panel rounded-[1.8rem] border border-[var(--border)] p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Top Search Pages</p>
          <h2 className="mt-3 text-3xl font-semibold">最有機會放大的頁面</h2>
          <div className="mt-5 max-h-[18rem] space-y-3 overflow-y-auto pr-1">
            {gscOverview.topPages.length ? (
              gscOverview.topPages.map((page) => (
                <article key={page.page} className="rounded-[1.3rem] border border-[var(--border)] bg-white/72 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 flex-1 text-sm font-medium">{page.page}</p>
                    <div className="text-right text-sm">
                      <p>{page.clicks} clicks</p>
                      <p className="text-[var(--muted)]">CTR {(page.ctr * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <p className="text-sm text-[var(--muted)]">接好 Search Console 後，這裡會開始回答「哪些頁面最該補 title / desc / CTA」。</p>
            )}
          </div>
        </article>
      </section>

      {analytics.personaSnapshot ? (
        <section className="grid gap-4 xl:grid-cols-[0.88fr_1.12fr]">
          <article className="rounded-[1.8rem] bg-[var(--card-dark)] p-6 text-white shadow-[0_24px_60px_rgba(15,10,7,0.22)]">
            <p className="text-xs uppercase tracking-[0.24em] text-white/55">Persona Snapshot</p>
            <h2 className="mt-3 text-3xl font-semibold">{analytics.personaSnapshot.label}</h2>
            <p className="mt-3 text-sm text-white/70">Tone · {analytics.personaSnapshot.tone}</p>
            <p className="mt-4 text-sm leading-7 text-white/78">{analytics.personaSnapshot.patternNote}</p>
            <p className="mt-4 rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/82">
              {analytics.personaSnapshot.recommendedMove}
            </p>
          </article>
          <article className="glass-panel rounded-[1.8rem] border border-[var(--border)] p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">What This Means</p>
            <h2 className="mt-3 text-3xl font-semibold">這個帳號現在更像怎麼贏</h2>
            <div className="mt-5 space-y-3 text-sm leading-7 text-[var(--muted)]">
              <p className="rounded-[1.2rem] border border-[var(--border)] bg-white/72 px-4 py-3">
                先用 account filter 切到單一 Threads 帳號，再看這塊，你會更清楚「這個人設最近是靠討論、靠轉發，還是靠短句結論」。
              </p>
              <p className="rounded-[1.2rem] border border-[var(--border)] bg-white/72 px-4 py-3">
                接著回 `Compose`，把 Persona Assist 和 Persona Memory 一起用，會比只看總體帳號數字更貼近實際寫稿決策。
              </p>
            </div>
          </article>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {totalCards.map((card) => (
          <article key={card.label} className="metric-card">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold">{card.value}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">最近收集到的 Threads 貼文指標總量</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {analytics.benchmarks.map((card) => (
          <article key={card.label} className="rounded-[1.5rem] border border-[var(--border)] bg-[rgba(255,250,244,0.78)] p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">{card.label}</p>
            <p className="mt-3 text-2xl font-semibold">{card.value}</p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="glass-panel rounded-[1.8rem] border border-[var(--border)] p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Best Current Post</p>
          <h2 className="mt-3 text-3xl font-semibold">{bestPost ? bestPost.account : "尚無資料"}</h2>
          {bestPost?.personaLabel ? <p className="mt-2 text-sm text-[var(--muted)]">{bestPost.personaLabel}</p> : null}
          <p className="mt-4 text-base leading-7">{bestPost?.text ?? "等第一批 Threads metrics 回來後，這裡會顯示當前表現最好的內容。"}</p>
          {bestPost ? (
            <div className="mt-5 flex flex-wrap gap-3 text-sm text-[var(--muted)]">
              <span className="pill-tag">Views {bestPost.views}</span>
              <span className="pill-tag">Likes {bestPost.likes}</span>
              <span className="pill-tag">Replies {bestPost.replies}</span>
              <span className="pill-tag">Reposts {bestPost.reposts}</span>
              <span className="pill-tag">Quotes {bestPost.quotes}</span>
              <span className="pill-tag">Shares {bestPost.shares}</span>
            </div>
          ) : null}
          {bestPost ? (
            <a href={`/posts/${bestPost.id}`} className="mt-5 inline-flex text-sm font-medium text-[var(--accent)]">
              看這篇完整復盤
            </a>
          ) : null}
        </article>
        <article className="rounded-[1.8rem] bg-[var(--card-dark)] p-6 text-white shadow-[0_24px_60px_rgba(15,10,7,0.22)]">
          <p className="text-xs uppercase tracking-[0.24em] text-white/55">Rewrite Next</p>
          <h2 className="mt-3 text-3xl font-semibold">
            {strongestCandidate ? `${strongestCandidate.score} / 100` : "Waiting"}
          </h2>
          <p className="mt-4 text-sm leading-7 text-white/72">
            {strongestCandidate?.suggestion ?? "有足夠的貼文和 metrics 後，這裡會告訴你哪篇最值得重寫或延伸成系列。"}
          </p>
          {strongestCandidate?.reasons.length ? (
              <div className="mt-5 space-y-2 text-sm text-white/78">
                {strongestCandidate.reasons.map((reason) => (
                  <p key={reason}>- {reason}</p>
                ))}
              </div>
            ) : null}
          {strongestCandidate ? (
            <a href={`/posts/${strongestCandidate.id}`} className="mt-5 inline-flex text-sm font-medium text-white">
              打開這篇完整指標
            </a>
          ) : null}
        </article>
      </section>

      <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Threads Snapshots</p>
            <h2 className="mt-2 text-3xl font-semibold">
              {analytics.filters.window === "7d"
                ? "近 7 天 Threads 數字快照"
                : analytics.filters.window === "30d"
                  ? "近 30 天 Threads 數字快照"
                  : "全部可用 Threads 數字快照"}
            </h2>
          </div>
          <form action="/api/cron/metrics" method="post">
            <button className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm text-white">立即收集指標</button>
          </form>
        </div>

        <div className="mt-6 max-h-[18rem] space-y-3 overflow-y-auto pr-1">
          {compactSnapshots.map((item) => (
            <article key={item.label} className="rounded-[1.3rem] border border-[var(--border)] bg-white/72 px-4 py-3">
              <div className="grid gap-3 sm:grid-cols-[120px_1fr_1fr] sm:items-center">
                <p className="text-sm font-medium">{item.label}</p>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Followers</p>
                  <p className="mt-1 text-lg font-semibold">{item.followers}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Engagement</p>
                  <p className="mt-1 text-lg font-semibold">{item.engagement}</p>
                </div>
              </div>
            </article>
          ))}
          {analytics.followerTrend.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">還沒有 metrics snapshot，先按上方按鈕或呼叫 cron route 收集一次。</p>
          ) : null}
        </div>
      </section>

      <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
        <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Viral Radar</p>
        <h2 className="mt-2 text-3xl font-semibold">值得放大的 Threads</h2>
        <div className="mt-6 max-h-[22rem] space-y-4 overflow-y-auto pr-1">
          {analytics.viralCandidates.map((post) => (
            <article key={post.id} className="rounded-[1.5rem] border border-[var(--border)] bg-white/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  {post.account}{post.personaLabel ? ` · ${post.personaLabel}` : ""}
                </p>
                <span
                  className={`rounded-full px-3 py-1 text-xs uppercase ${
                    post.label === "high"
                      ? "bg-[var(--success-soft)] text-[var(--success)]"
                      : post.label === "medium"
                        ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                        : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {post.label} · {post.score}
                </span>
              </div>
              <p className="mt-2 text-base">{post.text}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-sm text-[var(--muted)]">
                {post.reasons.map((reason) => (
                  <span key={reason} className="pill-tag">
                    {reason}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-sm text-[var(--muted)]">{post.suggestion}</p>
              <a href={`/posts/${post.id}`} className="mt-4 inline-flex text-sm font-medium text-[var(--accent)]">
                看完整復盤
              </a>
            </article>
          ))}
          {analytics.viralCandidates.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">目前還沒有足夠的貼文與 metrics 資料可評估爆款潛力。</p>
          ) : null}
        </div>
      </section>

      <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
        <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Top Posts</p>
        <h2 className="mt-2 text-3xl font-semibold">目前表現最好的 Threads</h2>
        <div className="mt-6 max-h-[22rem] space-y-4 overflow-y-auto pr-1">
          {analytics.topPosts.map((post) => (
            <article key={post.id} className="rounded-[1.5rem] border border-[var(--border)] bg-white/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                {post.account}{post.personaLabel ? ` · ${post.personaLabel}` : ""}
              </p>
              <p className="mt-2 text-base">{post.text}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-sm text-[var(--muted)]">
                <span className="pill-tag">Views {post.views}</span>
                <span className="pill-tag">Likes {post.likes}</span>
                <span className="pill-tag">Replies {post.replies}</span>
                <span className="pill-tag">Reposts {post.reposts}</span>
                <span className="pill-tag">Quotes {post.quotes}</span>
                <span className="pill-tag">Shares {post.shares}</span>
              </div>
              <a href={`/posts/${post.id}`} className="mt-4 inline-flex text-sm font-medium text-[var(--accent)]">
                看完整指標
              </a>
            </article>
          ))}
          {analytics.topPosts.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">目前還沒有足夠的貼文 metrics 資料。</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
