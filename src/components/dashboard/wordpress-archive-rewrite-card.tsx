"use client";

import { useMemo, useState, useTransition } from "react";

type ArchivePost = {
  accountId: string;
  siteUrl: string;
  remotePostId: number;
  title: string;
  excerpt: string;
  status: string;
  publishedAt: string;
  link: string;
};

export function WordPressArchiveRewriteCard({ posts }: { posts: ArchivePost[] }) {
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const visiblePosts = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return posts.filter((post) => {
      if (!normalized) return true;
      return `${post.siteUrl} ${post.title} ${post.excerpt}`.toLowerCase().includes(normalized);
    });
  }, [posts, query]);

  return (
    <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Rewrite From Archive</p>
          <h2 className="mt-2 text-3xl font-semibold">從既有文章複寫成新稿</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
            選一篇你自己的舊文，系統會沿用你已建立的寫作風格與聯盟連結規劃，重新生成一篇新的 WordPress 草稿，方便你再編修發佈。
          </p>
        </div>
        <input
          className="w-full rounded-full border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none lg:max-w-sm"
          placeholder="搜尋站台或文章標題"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="mt-6 grid gap-4">
        {visiblePosts.slice(0, 10).map((post) => (
          <article key={`${post.accountId}-${post.remotePostId}`} className="rounded-[1.6rem] border border-[var(--border)] bg-white/75 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  {post.siteUrl} · {post.status} · {post.publishedAt}
                </p>
                <h3 className="mt-2 text-xl font-semibold">{post.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{post.excerpt || "這篇文章沒有摘要，系統會直接吃正文。"} </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-3">
                <a
                  href={post.link}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm"
                >
                  看原文
                </a>
                <button
                  disabled={isPending}
                  className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm text-white disabled:opacity-60"
                  onClick={() =>
                    startTransition(async () => {
                      setMessage(null);
                      const response = await fetch("/api/wordpress/rewrite-from-post", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          accountId: post.accountId,
                          remotePostId: post.remotePostId
                        })
                      });
                      const result = await response.json();

                      if (!response.ok) {
                        setMessage(result.message ?? "複寫失敗");
                        return;
                      }

                      setMessage(result.message ?? "已建立新草稿。");
                      window.location.href = `/compose?postId=${result.postId}`;
                    })
                  }
                >
                  {isPending ? "生成中..." : "複寫成新草稿"}
                </button>
              </div>
            </div>
          </article>
        ))}
        {visiblePosts.length === 0 ? (
          <article className="rounded-[1.6rem] border border-dashed border-[var(--border)] p-5 text-sm text-[var(--muted)]">
            目前沒有可用的舊文。先連接 WordPress，或確認站台裡真的已有文章。
          </article>
        ) : null}
      </div>

      {message ? <p className="mt-4 text-sm text-[var(--muted)]">{message}</p> : null}
    </section>
  );
}
