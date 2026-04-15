import { DatabaseBanner } from "@/components/dashboard/database-banner";
import { PageIntro } from "@/components/dashboard/page-intro";
import { getAnalyticsOverview, getDatabaseStatus } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const [databaseStatus, analytics] = await Promise.all([getDatabaseStatus(), getAnalyticsOverview()]);
  const bestPost = analytics.topPosts[0] ?? null;
  const strongestCandidate = analytics.viralCandidates[0] ?? null;
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
        description="這裡只看 Threads：配額、token 健康、成長趨勢、爆款候選和目前最值得改寫再打一次的內容。"
      />
      <DatabaseBanner status={databaseStatus} />

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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {totalCards.map((card) => (
          <article key={card.label} className="rounded-[1.5rem] border border-[var(--border)] bg-white/75 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold">{card.value}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">最近收集到的 Threads 貼文指標總量</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="glass-panel rounded-[1.8rem] border border-[var(--border)] p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Best Current Post</p>
          <h2 className="mt-3 text-3xl font-semibold">{bestPost ? bestPost.account : "尚無資料"}</h2>
          <p className="mt-4 text-base leading-7">{bestPost?.text ?? "等第一批 Threads metrics 回來後，這裡會顯示當前表現最好的內容。"}</p>
          {bestPost ? (
            <div className="mt-5 flex flex-wrap gap-3 text-sm text-[var(--muted)]">
              <span className="rounded-full border border-[var(--border)] px-3 py-1">Views {bestPost.views}</span>
              <span className="rounded-full border border-[var(--border)] px-3 py-1">Likes {bestPost.likes}</span>
              <span className="rounded-full border border-[var(--border)] px-3 py-1">Replies {bestPost.replies}</span>
              <span className="rounded-full border border-[var(--border)] px-3 py-1">Reposts {bestPost.reposts}</span>
              <span className="rounded-full border border-[var(--border)] px-3 py-1">Quotes {bestPost.quotes}</span>
              <span className="rounded-full border border-[var(--border)] px-3 py-1">Shares {bestPost.shares}</span>
            </div>
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
        </article>
      </section>

      <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Follower Trend</p>
            <h2 className="mt-2 text-3xl font-semibold">近 7 次 Threads 快照</h2>
          </div>
          <form action="/api/cron/metrics" method="post">
            <button className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm text-white">立即收集指標</button>
          </form>
        </div>

        <div className="mt-8 space-y-4">
          {analytics.followerTrend.map((item) => {
            const followerMax = Math.max(...analytics.followerTrend.map((entry) => entry.followers), 1);
            const engagementMax = Math.max(...analytics.followerTrend.map((entry) => entry.engagement), 1);

            return (
              <div key={item.label} className="grid grid-cols-[72px_1fr_1fr] items-center gap-4 text-sm">
                <span className="text-[var(--muted)]">{item.label}</span>
                <div className="rounded-full bg-white/80 p-1">
                  <div
                    className="h-3 rounded-full bg-[var(--accent)]"
                    style={{ width: `${(item.followers / followerMax) * 100}%` }}
                  />
                </div>
                <div className="rounded-full bg-white/80 p-1">
                  <div
                    className="h-3 rounded-full bg-[var(--success)]"
                    style={{ width: `${(item.engagement / engagementMax) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
          {analytics.followerTrend.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">還沒有 metrics snapshot，先按上方按鈕或呼叫 cron route 收集一次。</p>
          ) : null}
        </div>
      </section>

      <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
        <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Viral Radar</p>
        <h2 className="mt-2 text-3xl font-semibold">值得放大的 Threads</h2>
        <div className="mt-6 space-y-4">
          {analytics.viralCandidates.map((post) => (
            <article key={post.id} className="rounded-[1.5rem] border border-[var(--border)] bg-white/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{post.account}</p>
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
                  <span key={reason} className="rounded-full border border-[var(--border)] px-3 py-1">
                    {reason}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-sm text-[var(--muted)]">{post.suggestion}</p>
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
        <div className="mt-6 space-y-4">
          {analytics.topPosts.map((post) => (
            <article key={post.id} className="rounded-[1.5rem] border border-[var(--border)] bg-white/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{post.account}</p>
              <p className="mt-2 text-base">{post.text}</p>
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-[var(--muted)]">
                <span>Views {post.views}</span>
                <span>Likes {post.likes}</span>
                <span>Replies {post.replies}</span>
                <span>Reposts {post.reposts}</span>
                <span>Quotes {post.quotes}</span>
                <span>Shares {post.shares}</span>
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
