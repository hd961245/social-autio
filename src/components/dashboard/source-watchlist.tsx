"use client";

import { useState, useTransition } from "react";

type SourceItem = {
  id: string;
  label: string;
  sourceType: "rss" | "url";
  sourceUrl: string;
  isActive: boolean;
  lastFetchedAt: string;
  lastItemTitle: string;
  lastItemUrl: string;
  lastExcerpt: string;
  lastHandledStatus: "new" | "imported" | "skipped";
  lastError: string;
};

export function SourceWatchlist({ initialItems }: { initialItems: SourceItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [label, setLabel] = useState("");
  const [sourceType, setSourceType] = useState<"rss" | "url">("rss");
  const [sourceUrl, setSourceUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function getStatusLabel(status: SourceItem["lastHandledStatus"]) {
    if (status === "imported") return "已改寫";
    if (status === "skipped") return "已跳過";
    return "待處理";
  }

  function getStatusClasses(status: SourceItem["lastHandledStatus"]) {
    if (status === "imported") return "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (status === "skipped") return "border-stone-200 bg-stone-100 text-stone-700";
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Source Watchlist</p>
          <h2 className="mt-2 text-3xl font-semibold">固定追蹤來源</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
            先收你常看的 RSS、部落格或公開文章頁。每次手動刷新後，可以直接把最新內容送進 Content Engine，變成 Threads + WordPress 草稿。
          </p>
        </div>

        <form
          className="mt-6 grid gap-4 lg:grid-cols-[1fr_180px_1.2fr_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              setMessage(null);
              const response = await fetch("/api/sources", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ label, sourceType, sourceUrl })
              });
              const result = await response.json();

              if (!response.ok) {
                setMessage(result.message ?? "新增來源失敗");
                return;
              }

              setItems((current) => [
                {
                  id: result.item.id,
                  label: result.item.label,
                  sourceType: result.item.sourceType,
                  sourceUrl: result.item.sourceUrl,
                  isActive: result.item.isActive,
                  lastFetchedAt: "尚未刷新",
                  lastItemTitle: "",
                  lastItemUrl: "",
                  lastExcerpt: "",
                  lastHandledStatus: "new",
                  lastError: ""
                },
                ...current
              ]);
              setLabel("");
              setSourceUrl("");
              setMessage("已加入來源名單。");
            });
          }}
        >
          <input
            className="rounded-2xl border border-[var(--border)] bg-white/85 px-4 py-3"
            placeholder="來源名稱，例如 Growth Blog"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            required
          />
          <select
            className="rounded-2xl border border-[var(--border)] bg-white/85 px-4 py-3"
            value={sourceType}
            onChange={(event) => setSourceType(event.target.value as "rss" | "url")}
          >
            <option value="rss">RSS</option>
            <option value="url">文章頁 / Blog</option>
          </select>
          <input
            className="rounded-2xl border border-[var(--border)] bg-white/85 px-4 py-3"
            placeholder={sourceType === "rss" ? "https://site.com/feed.xml" : "https://site.com/article"}
            value={sourceUrl}
            onChange={(event) => setSourceUrl(event.target.value)}
            required
          />
          <button disabled={isPending} className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm text-white">
            {isPending ? "新增中..." : "加入名單"}
          </button>
        </form>
        {message ? <p className="mt-4 text-sm text-[var(--muted)]">{message}</p> : null}
      </section>

      <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Tracked Sources</p>
            <h2 className="mt-2 text-3xl font-semibold">來源列表</h2>
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          {items.map((item) => (
            <article key={item.id} className="rounded-[1.6rem] border border-[var(--border)] bg-white/75 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                    {item.sourceType} · 最後刷新 {item.lastFetchedAt}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-semibold">{item.label}</h3>
                    <span className={`rounded-full border px-3 py-1 text-xs ${getStatusClasses(item.lastHandledStatus)}`}>
                      {getStatusLabel(item.lastHandledStatus)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[var(--muted)]">{item.sourceUrl}</p>
                  {item.lastItemTitle ? <p className="mt-4 text-sm font-medium">{item.lastItemTitle}</p> : null}
                  {item.lastExcerpt ? <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{item.lastExcerpt}</p> : null}
                  {item.lastError ? <p className="mt-2 text-sm text-rose-600">{item.lastError}</p> : null}
                </div>
                <div className="flex shrink-0 flex-wrap gap-3">
                  {item.lastItemUrl ? (
                    <a
                      href={item.lastItemUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm"
                    >
                      看最新原文
                    </a>
                  ) : null}
                  <button
                    disabled={isPending}
                    className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm"
                    onClick={() =>
                      startTransition(async () => {
                        setMessage(null);
                        const response = await fetch(`/api/sources/${item.id}/refresh`, { method: "POST" });
                        const result = await response.json();

                        if (!response.ok) {
                          setMessage(result.message ?? "刷新失敗");
                          return;
                        }

                        setItems((current) =>
                          current.map((source) =>
                            source.id === item.id
                              ? {
                                  ...source,
                                  lastFetchedAt: "剛剛",
                                  lastItemTitle: result.preview.title,
                                  lastItemUrl: result.preview.url,
                                  lastExcerpt: result.preview.excerpt,
                                  lastHandledStatus: source.lastHandledStatus,
                                  lastError: ""
                                }
                              : source
                          )
                        );
                        setMessage(`已刷新 ${item.label}`);
                      })
                    }
                  >
                    刷新來源
                  </button>
                  <button
                    disabled={isPending}
                    className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm text-white"
                    onClick={() =>
                      startTransition(async () => {
                        setMessage(null);
                        const response = await fetch(`/api/sources/${item.id}/refresh`, { method: "PUT" });
                        const result = await response.json();

                        if (!response.ok) {
                          setMessage(result.message ?? "建立草稿失敗");
                          return;
                        }

                        setItems((current) =>
                          current.map((source) =>
                            source.id === item.id
                              ? {
                                  ...source,
                                  lastFetchedAt: "剛剛",
                                  lastItemTitle: result.preview.title,
                                  lastItemUrl: result.preview.url,
                                  lastExcerpt: result.preview.excerpt,
                                  lastHandledStatus: result.duplicated ? source.lastHandledStatus : "imported",
                                  lastError: ""
                                }
                              : source
                          )
                        );
                        setMessage(
                          result.duplicated
                            ? "這篇最新內容之前已經改寫過，這次不重複建草稿。"
                            : "已從來源建立新草稿，去 Queue 或 Compose 就能接著修。"
                        );
                      })
                    }
                  >
                    一鍵改寫
                  </button>
                  <button
                    disabled={isPending}
                    className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm"
                    onClick={() =>
                      startTransition(async () => {
                        setMessage(null);
                        const response = await fetch(`/api/sources/${item.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ lastHandledStatus: "skipped" })
                        });
                        const result = await response.json();

                        if (!response.ok) {
                          setMessage(result.message ?? "標記失敗");
                          return;
                        }

                        setItems((current) =>
                          current.map((source) =>
                            source.id === item.id ? { ...source, lastHandledStatus: "skipped" } : source
                          )
                        );
                        setMessage("已標記為先略過。");
                      })
                    }
                  >
                    先略過
                  </button>
                </div>
              </div>
            </article>
          ))}
          {items.length === 0 ? (
            <article className="rounded-[1.6rem] border border-dashed border-[var(--border)] p-5 text-sm text-[var(--muted)]">
              目前還沒有來源名單。先加一個 RSS 或公開文章頁。
            </article>
          ) : null}
        </div>
      </section>
    </div>
  );
}
