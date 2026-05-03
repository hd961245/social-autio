import { PageIntro } from "@/components/dashboard/page-intro";
import { PostsList } from "@/components/dashboard/posts-list";
import { SyncWordPressButton } from "@/components/dashboard/sync-wordpress-button";
import { getPostSummaries, getWordPressExpansionCandidates } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function ReviewBoardPage() {
  const [posts, expansionCandidates] = await Promise.all([getPostSummaries(), getWordPressExpansionCandidates()]);
  const pendingReviewPosts = posts.filter(
    (post) =>
      post.platform === "threads" &&
      ["draft", "awaiting_approval", "approval_rejected"].includes(post.status)
  );
  const directPosts = pendingReviewPosts.filter((post) => post.reviewLane === "direct");
  const reviewPosts = pendingReviewPosts.filter((post) => post.reviewLane !== "direct");

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Review"
        title="所有需要你拍板的內容，都先進這裡"
        description="Review 是唯一拍板台。來源、自動產稿、強表現貼文衍生出的候選稿，都先在這裡決定 Assignment、是否直接發、或轉成長文。"
      />

      <section className="grid gap-4 xl:grid-cols-3">
        {[
          { label: "待拍板 Threads", value: String(reviewPosts.length), detail: "需要先進 assignment / review workspace" },
          { label: "可直接最後確認", value: String(directPosts.length), detail: "高信心稿，可直接最後確認與送出" },
          { label: "長文擴寫候選", value: String(expansionCandidates.length), detail: "值得沉成 WordPress draft 的強表現貼文" }
        ].map((card) => (
          <article key={card.label} className="metric-card">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold">{card.value}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{card.detail}</p>
          </article>
        ))}
      </section>

      {expansionCandidates.length > 0 ? (
        <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">WordPress Expansion</p>
              <h2 className="mt-2 text-2xl font-semibold">強表現 Threads，先在這裡決定要不要沉成長文</h2>
            </div>
            <a href="/wordpress" className="text-sm font-medium text-[var(--accent)]">
              去 WordPress 草稿台
            </a>
          </div>
          <div className="mt-5 grid gap-3">
            {expansionCandidates.slice(0, 4).map((post) => (
              <article key={post.id} className="rounded-[1.4rem] border border-[var(--border)] bg-white/82 p-4">
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
        </section>
      ) : null}

      <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
        <div className="mb-6">
          <p className="text-sm text-[var(--muted)]">這裡預設先看待拍板 Threads。高信心稿仍然先給你最後確認，不直接把你推進發布表單。</p>
          <p className="mt-1 text-xs text-[var(--muted)]">如果你只想處理最後一哩，就先看「可直接發」那層；如果要給 AI assignment，就進確認區。</p>
        </div>
        <PostsList posts={pendingReviewPosts} />
      </section>
    </div>
  );
}
