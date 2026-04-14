"use client";

import { useState, useTransition } from "react";
import type { PostSummary } from "@/lib/dashboard-data";

export function PostsList({ posts }: { posts: PostSummary[] }) {
  const [items, setItems] = useState(posts);
  const [platformFilter, setPlatformFilter] = useState<"all" | "threads" | "wordpress">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "scheduled" | "published" | "failed">("all");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const visibleItems = items.filter((post) => {
    const matchesPlatform = platformFilter === "all" || post.platform === platformFilter;
    const matchesStatus = statusFilter === "all" || post.status === statusFilter;
    const matchesQuery =
      !query.trim() ||
      `${post.account} ${post.platform} ${post.text} ${post.title ?? ""}`.toLowerCase().includes(query.trim().toLowerCase());

    return matchesPlatform && matchesStatus && matchesQuery;
  });

  function getStatusClasses(status: string) {
    if (status === "published") return "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (status === "scheduled") return "border-amber-200 bg-amber-50 text-amber-700";
    if (status === "draft") return "border-stone-200 bg-stone-100 text-stone-700";
    if (status === "failed") return "border-rose-200 bg-rose-50 text-rose-700";
    return "border-[var(--border)] bg-white text-[var(--foreground)]";
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-[1.6rem] border border-[var(--border)] bg-white/72 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {[
            { value: "all", label: "全部" },
            { value: "threads", label: "Threads" },
            { value: "wordpress", label: "WP 草稿" }
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              className={`rounded-full px-4 py-2 text-sm ${
                platformFilter === option.value ? "bg-[var(--card-dark)] text-white" : "bg-white text-[var(--foreground)]"
              }`}
              onClick={() => setPlatformFilter(option.value as "all" | "threads" | "wordpress")}
            >
              {option.label}
            </button>
          ))}
          {[
            { value: "all", label: "所有狀態" },
            { value: "draft", label: "草稿" },
            { value: "scheduled", label: "排程" },
            { value: "published", label: "已發布" },
            { value: "failed", label: "失敗" }
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              className={`rounded-full px-4 py-2 text-sm ${
                statusFilter === option.value ? "bg-[var(--accent)] text-white" : "bg-white text-[var(--foreground)]"
              }`}
              onClick={() =>
                setStatusFilter(option.value as "all" | "draft" | "scheduled" | "published" | "failed")
              }
            >
              {option.label}
            </button>
          ))}
        </div>
        <input
          className="w-full rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm outline-none lg:max-w-xs"
          placeholder="搜尋帳號或文案"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      {visibleItems.map((post) => (
        <article key={post.id} className="rounded-3xl border border-[var(--border)] bg-white/80 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-[var(--muted)]">
                {post.account} · {post.platform === "wordpress" ? "WordPress Draft" : "Threads"}
              </p>
              <h2 className="mt-1 text-xl font-semibold">{post.text}</h2>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs uppercase ${getStatusClasses(post.status)}`}>{post.status}</span>
          </div>
          <p className="mt-4 text-sm text-[var(--muted)]">{post.status === "draft" ? "Last saved" : "Scheduled at"} {post.scheduledAt}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {post.platformUrl ? (
              <a href={post.platformUrl} target="_blank" className="text-sm text-[var(--accent)]">
                {post.platform === "wordpress" ? "打開 WordPress 草稿" : "查看平台貼文"}
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
                          status: "draft",
                          scheduledAt: "剛剛",
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
            {post.status !== "published" ? (
              <a href={`/compose?postId=${post.id}`} className="rounded-full border border-[var(--border)] bg-white/70 px-4 py-2 text-sm">
                繼續編輯
              </a>
            ) : null}
          </div>
        </article>
      ))}
      {visibleItems.length === 0 ? (
        <article className="rounded-3xl border border-dashed border-[var(--border)] p-5 text-sm text-[var(--muted)]">
          目前沒有符合篩選條件的項目。
        </article>
      ) : null}
      {message ? <p className="text-sm text-[var(--muted)]">{message}</p> : null}
    </div>
  );
}
