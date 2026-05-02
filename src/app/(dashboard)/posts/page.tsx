import { PostsList } from "@/components/dashboard/posts-list";
import { PageIntro } from "@/components/dashboard/page-intro";
import { SyncWordPressButton } from "@/components/dashboard/sync-wordpress-button";
import { getPostSummaries, getWordPressExpansionCandidates } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function PostsPage() {
  const [posts, expansionCandidates] = await Promise.all([getPostSummaries(), getWordPressExpansionCandidates()]);

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Master Review"
        title="文章總表"
        description="AI 先把文章準備好，你在這裡只要看方向、打勾、直接發。排程、已發出與 WordPress 草稿也一起收在同一張表。"
      />

      <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
        {expansionCandidates.length > 0 ? (
          <div className="mb-6 space-y-3 rounded-[1.6rem] border border-[var(--border)] bg-[rgba(255,252,248,0.82)] p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">Expand Winners</p>
                <h2 className="mt-2 text-2xl font-semibold">這幾篇值得直接沉成長文</h2>
              </div>
              <a href="/wordpress" className="text-sm font-medium text-[var(--accent)]">
                去 WordPress
              </a>
            </div>
            <div className="grid gap-3">
              {expansionCandidates.slice(0, 3).map((post) => (
                <article key={post.id} className="rounded-[1.3rem] border border-[var(--border)] bg-white/85 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{post.account}</p>
                    <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs text-[var(--foreground)]">
                      長文分數 {post.longformScore}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-medium leading-7">{post.text}</p>
                  <p className="mt-3 text-sm text-[var(--muted)]">{post.reason}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-sm">
                    <span className="rounded-full bg-white px-4 py-2">Views {post.views}</span>
                    <span className="rounded-full bg-white px-4 py-2">Replies {post.replies}</span>
                    <span className="rounded-full bg-white px-4 py-2">{post.momentumLabel}</span>
                  </div>
                  <div className="mt-4">
                    <SyncWordPressButton postId={post.id} />
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-[var(--muted)]">這裡是主要工作表，預設先看待確認的 Threads 草稿。</p>
            <p className="mt-1 text-xs text-[var(--muted)]">如果你只想做最後確認，直接勾選後發布就好；排程還是由 Inngest 自動處理。</p>
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
    </div>
  );
}
