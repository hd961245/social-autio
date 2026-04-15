import { PageIntro } from "@/components/dashboard/page-intro";
import { getThreadPostDeepDive } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getThreadPostDeepDive(id);

  if (!post) {
    return (
      <div className="space-y-6">
        <PageIntro
          eyebrow="Post Detail"
          title="找不到這篇貼文"
          description="這篇內容可能不是 Threads 已發布貼文，或目前還沒有可讀取的 metrics 資料。"
        />
      </div>
    );
  }

  const maxValue = Math.max(
    1,
    ...post.timeline.flatMap((point) => [point.views, point.likes, point.replies, point.reposts, point.quotes, point.shares])
  );

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Metrics Deep Dive"
        title="單篇 Threads 復盤"
        description="這裡會拉開這篇貼文的完整指標走勢，幫你看它是短時間衝高、慢慢發酵，還是真的值得二次擴寫。"
      />

      <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">{post.account} · {post.publishedAt}</p>
        <h2 className="mt-3 text-3xl font-semibold">{post.text}</h2>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="pill-tag">互動率 {(post.health.engagementRate * 100).toFixed(1)}%</span>
          <span className="pill-tag">對話率 {(post.health.conversationRate * 100).toFixed(1)}%</span>
          <span className="pill-tag">擴散率 {(post.health.amplificationRate * 100).toFixed(1)}%</span>
          <span className="pill-tag">{post.health.momentumLabel}</span>
        </div>
        {post.platformUrl ? (
          <a href={post.platformUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex text-sm text-[var(--accent)]">
            打開 Threads 原文
          </a>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[
          { label: "Views", value: post.latest.views },
          { label: "Likes", value: post.latest.likes },
          { label: "Replies", value: post.latest.replies },
          { label: "Reposts", value: post.latest.reposts },
          { label: "Quotes", value: post.latest.quotes },
          { label: "Shares", value: post.latest.shares }
        ].map((item) => (
          <article key={item.label} className="metric-card">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold">{item.value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
          <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Read</p>
          <h2 className="mt-2 text-3xl font-semibold">這篇現在的判讀</h2>
          <div className="mt-6 space-y-3">
            {post.insights.map((insight) => (
              <p key={insight} className="rounded-[1.2rem] border border-[var(--border)] bg-white/72 px-4 py-3 text-sm leading-7 text-[var(--muted)]">
                {insight}
              </p>
            ))}
          </div>
        </article>
        <article className="rounded-[2rem] bg-[var(--card-dark)] p-6 text-white shadow-[0_24px_60px_rgba(15,10,7,0.22)]">
          <p className="text-[11px] uppercase tracking-[0.3em] text-white/55">Next Move</p>
          <h2 className="mt-2 text-3xl font-semibold">下一步怎麼處理</h2>
          <p className="mt-5 text-base leading-8 text-white/78">{post.nextAction}</p>
          <a
            href={`/compose?postId=${post.id}`}
            className="mt-6 inline-flex rounded-full bg-white px-4 py-2 text-sm font-medium text-[var(--card-dark)]"
          >
            去 Compose 續寫這篇
          </a>
        </article>
      </section>

      <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
        <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Timeline</p>
        <h2 className="mt-2 text-3xl font-semibold">指標時間線</h2>
        <div className="mt-8 space-y-5">
          {post.timeline.map((point) => (
            <div key={point.label} className="space-y-3 rounded-[1.4rem] border border-[var(--border)] bg-white/72 p-4">
              <p className="text-sm font-medium text-[var(--foreground)]">{point.label}</p>
              {[
                { label: "Views", value: point.views, color: "bg-[var(--accent)]" },
                { label: "Likes", value: point.likes, color: "bg-[var(--success)]" },
                { label: "Replies", value: point.replies, color: "bg-sky-500" },
                { label: "Reposts", value: point.reposts, color: "bg-amber-500" },
                { label: "Quotes", value: point.quotes, color: "bg-violet-500" },
                { label: "Shares", value: point.shares, color: "bg-slate-500" }
              ].map((metric) => (
                <div key={metric.label} className="grid grid-cols-[80px_1fr_80px] items-center gap-4 text-sm">
                  <span className="text-[var(--muted)]">{metric.label}</span>
                  <div className="rounded-full bg-white p-1">
                    <div
                      className={`h-3 rounded-full ${metric.color}`}
                      style={{ width: `${(metric.value / maxValue) * 100}%` }}
                    />
                  </div>
                  <span className="text-right text-[var(--foreground)]">{metric.value}</span>
                </div>
              ))}
            </div>
          ))}
          {post.timeline.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">這篇貼文目前還沒有累積到可用的 metrics timeline。</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
