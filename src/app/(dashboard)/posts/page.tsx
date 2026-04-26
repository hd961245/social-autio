import { PostsList } from "@/components/dashboard/posts-list";
import { PageIntro } from "@/components/dashboard/page-intro";
import { getPostSummaries } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function PostsPage() {
  const posts = await getPostSummaries();

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Master Review"
        title="文章總表"
        description="AI 先把文章準備好，你在這裡只要看方向、打勾、直接發。排程、已發出與 WordPress 草稿也一起收在同一張表。"
      />

      <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
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
