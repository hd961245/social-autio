import { DatabaseBanner } from "@/components/dashboard/database-banner";
import { PageIntro } from "@/components/dashboard/page-intro";
import { getAnalyticsOverview, getDatabaseStatus } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const [databaseStatus, analytics] = await Promise.all([getDatabaseStatus(), getAnalyticsOverview()]);

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Analytics"
        title="帳號健康監控"
        description="現在除了 metrics snapshot、發文配額與 token 提醒，也會幫你評估哪些文最有爆款潛力。"
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

      <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Follower Trend</p>
            <h2 className="mt-2 text-3xl font-semibold">近 7 次快照</h2>
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
        <h2 className="mt-2 text-3xl font-semibold">爆款潛力候選</h2>
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
        <h2 className="mt-2 text-3xl font-semibold">最佳表現貼文</h2>
        <div className="mt-6 space-y-4">
          {analytics.topPosts.map((post) => (
            <article key={post.id} className="rounded-[1.5rem] border border-[var(--border)] bg-white/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{post.account}</p>
              <p className="mt-2 text-base">{post.text}</p>
              <div className="mt-4 flex gap-4 text-sm text-[var(--muted)]">
                <span>Views {post.views}</span>
                <span>Likes {post.likes}</span>
                <span>Replies {post.replies}</span>
              </div>
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
