import { PostsList } from "@/components/dashboard/posts-list";
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
        description="現在已支援 Threads 與 WordPress 的排程佇列，兩邊都可以互相一鍵轉成對方的平台草稿。"
      />

      <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-[var(--muted)]">排程需要 Zeabur 定時呼叫 `/api/cron/scheduler` 才會自動發出。</p>
            <p className="mt-1 text-xs text-[var(--muted)]">如果還沒設 Scheduled Request，貼文會停在 `scheduled`。</p>
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
