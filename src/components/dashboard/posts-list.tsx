"use client";

import { useState, useTransition } from "react";
import type { PostSummary } from "@/lib/dashboard-data";

export function PostsList({ posts }: { posts: PostSummary[] }) {
  const [items, setItems] = useState(posts);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      {items.map((post) => (
        <article key={post.id} className="rounded-3xl border border-[var(--border)] bg-white/80 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-[var(--muted)]">
                {post.account} · {post.platform}
              </p>
              <h2 className="mt-1 text-xl font-semibold">{post.text}</h2>
            </div>
            <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs uppercase">{post.status}</span>
          </div>
          <p className="mt-4 text-sm text-[var(--muted)]">Scheduled at {post.scheduledAt}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {post.platformUrl ? (
              <a href={post.platformUrl} target="_blank" className="text-sm text-[var(--accent)]">
                查看平台貼文
              </a>
            ) : null}
            {post.platform === "threads" && post.status === "published" ? (
              <button
                disabled={isPending}
                className="rounded-full border border-[var(--border)] bg-white/70 px-4 py-2 text-sm"
                onClick={() =>
                  startTransition(async () => {
                    const response = await fetch(`/api/posts/${post.id}/sync-wordpress`, {
                      method: "POST"
                    });
                    const result = await response.json();
                    setMessage(result.message ?? (response.ok ? "已建立 WordPress 草稿。" : "同步失敗"));

                    if (response.ok && !result.duplicated) {
                      setItems((current) => [
                        {
                          id: result.postId,
                          account: "WordPress",
                          accountId: "",
                          platform: "wordpress",
                          status: "scheduled",
                          scheduledAt: "立即",
                          text: `[Sync] ${post.title ?? post.text}`,
                          platformUrl: null,
                          title: `[Sync] ${post.title ?? post.text}`
                        },
                        ...current
                      ]);
                    }
                  })
                }
              >
                一鍵轉 WordPress 草稿
              </button>
            ) : null}
            {post.platform === "wordpress" && post.status === "published" ? (
              <button
                disabled={isPending}
                className="rounded-full border border-[var(--border)] bg-white/70 px-4 py-2 text-sm"
                onClick={() =>
                  startTransition(async () => {
                    const response = await fetch(`/api/posts/${post.id}/sync-threads`, {
                      method: "POST"
                    });
                    const result = await response.json();
                    setMessage(result.message ?? (response.ok ? "已建立 Threads 摘要佇列。" : "同步失敗"));

                    if (response.ok && !result.duplicated) {
                      setItems((current) => [
                        {
                          id: result.postId,
                          account: "Threads",
                          accountId: "",
                          platform: "threads",
                          status: "scheduled",
                          scheduledAt: "立即",
                          text: `【Blog Sync】${post.title ?? post.text}`,
                          platformUrl: null,
                          title: `【Blog Sync】${post.title ?? post.text}`
                        },
                        ...current
                      ]);
                    }
                  })
                }
              >
                一鍵轉 Threads 摘要
              </button>
            ) : null}
          </div>
        </article>
      ))}
      {items.length === 0 ? (
        <article className="rounded-3xl border border-dashed border-[var(--border)] p-5 text-sm text-[var(--muted)]">
          目前還沒有貼文紀錄，先到 Compose 頁送出第一篇。
        </article>
      ) : null}
      {message ? <p className="text-sm text-[var(--muted)]">{message}</p> : null}
    </div>
  );
}
