import { PageIntro } from "@/components/dashboard/page-intro";
import { getPostSummaries } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function PostsPage() {
  const posts = await getPostSummaries();

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Publishing Queue"
        title="排程與發布紀錄"
        description="現在已支援 Threads 與 WordPress 的排程佇列，也可以手動觸發 scheduler 立即處理到期工作。"
      />

      <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <p className="text-sm text-[var(--muted)]">Cron 預定每 1 分鐘掃描一次</p>
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

        <div className="space-y-4">
          {posts.map((post) => (
            <article key={post.id} className="rounded-3xl border border-[var(--border)] bg-white/80 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-[var(--muted)]">
                    {post.account} · {post.platform}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold">{post.text}</h2>
                </div>
                <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs uppercase">
                  {post.status}
                </span>
              </div>
              <p className="mt-4 text-sm text-[var(--muted)]">Scheduled at {post.scheduledAt}</p>
              {post.platformUrl ? (
                <a href={post.platformUrl} target="_blank" className="mt-2 inline-block text-sm text-[var(--accent)]">
                  查看平台貼文
                </a>
              ) : null}
            </article>
          ))}
          {posts.length === 0 ? (
            <article className="rounded-3xl border border-dashed border-[var(--border)] p-5 text-sm text-[var(--muted)]">
              目前還沒有貼文紀錄，先到 Compose 頁送出第一篇。
            </article>
          ) : null}
        </div>
      </section>
    </div>
  );
}
