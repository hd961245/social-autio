"use client";

import { useMemo, useState, useTransition } from "react";

type InboxItem = {
  id: string;
  label: string;
  sourceType: "rss" | "url";
  lastFetchedAt: string;
  title: string;
  url: string;
  excerpt: string;
  status: "new" | "imported" | "skipped";
  threadsScore: number;
  wordpressScore: number;
  commercialScore: number;
  recommendation: "threads-first" | "wordpress-first" | "dual";
  reasons: string[];
  memoryNote?: string;
};

export function SourceInbox({ initialItems }: { initialItems: InboxItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [statusFilter, setStatusFilter] = useState<"all" | "new" | "imported" | "skipped">("new");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return items.filter((item) => {
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesQuery =
        !normalized || `${item.label} ${item.title} ${item.excerpt}`.toLowerCase().includes(normalized);

      return matchesStatus && matchesQuery;
    });
  }, [items, query, statusFilter]);

  function statusClasses(status: InboxItem["status"]) {
    if (status === "imported") return "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (status === "skipped") return "border-stone-200 bg-stone-100 text-stone-700";
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  function recommendationLabel(recommendation: InboxItem["recommendation"]) {
    if (recommendation === "threads-first") return "先做 Threads";
    if (recommendation === "wordpress-first") return "先做長文";
    return "雙向都值得";
  }

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Source Inbox</p>
            <h2 className="mt-2 text-3xl font-semibold">最新待處理內容</h2>
          </div>
          <input
            className="w-full rounded-full border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none lg:max-w-sm"
            placeholder="搜尋來源或標題"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { value: "new", label: "待處理" },
            { value: "imported", label: "已改寫" },
            { value: "skipped", label: "已跳過" },
            { value: "all", label: "全部" }
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              className={`rounded-full px-4 py-2 text-sm ${
                statusFilter === option.value ? "bg-[var(--card-dark)] text-white" : "bg-white text-[var(--foreground)]"
              }`}
              onClick={() => setStatusFilter(option.value as "all" | "new" | "imported" | "skipped")}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4">
        {visibleItems.map((item) => (
          <article key={item.id} className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  {item.label} · {item.sourceType} · {item.lastFetchedAt}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <h3 className="text-2xl font-semibold">{item.title}</h3>
                  <span className={`rounded-full border px-3 py-1 text-xs ${statusClasses(item.status)}`}>
                    {item.status === "new" ? "待處理" : item.status === "imported" ? "已改寫" : "已跳過"}
                  </span>
                </div>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">{item.excerpt}</p>
                <div className="mt-4 flex flex-wrap gap-3 text-sm">
                  <span className="rounded-full bg-white px-4 py-2">Threads {item.threadsScore}</span>
                  <span className="rounded-full bg-white px-4 py-2">WordPress {item.wordpressScore}</span>
                  <span className="rounded-full bg-white px-4 py-2">商業潛力 {item.commercialScore}</span>
                  <span className="rounded-full bg-[var(--accent-soft)] px-4 py-2 text-[var(--foreground)]">
                    {recommendationLabel(item.recommendation)}
                  </span>
                </div>
                {item.reasons.length ? (
                  <div className="mt-4 space-y-2 text-sm text-[var(--muted)]">
                    {item.reasons.map((reason) => (
                      <p key={reason}>{reason}</p>
                    ))}
                  </div>
                ) : null}
                {item.memoryNote ? (
                  <p className="mt-4 rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 text-sm text-[var(--foreground)]">
                    {item.memoryNote}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-wrap gap-3">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm"
                >
                  看原文
                </a>
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
                          source.id === item.id ? { ...source, status: result.duplicated ? source.status : "imported" } : source
                        )
                      );
                      setMessage(
                        result.duplicated ? "這篇內容之前已改寫過。" : "已從 Inbox 建立新草稿，去 Queue 或 Compose 接著修。"
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
                        current.map((source) => (source.id === item.id ? { ...source, status: "skipped" } : source))
                      );
                      setMessage("已從 Inbox 標記為略過。");
                    })
                  }
                >
                  略過
                </button>
              </div>
            </div>
          </article>
        ))}
        {visibleItems.length === 0 ? (
          <article className="glass-panel rounded-[2rem] border border-dashed border-[var(--border)] p-6 text-sm text-[var(--muted)]">
            目前沒有符合條件的來源內容。可以先去 `來源` 頁新增來源或等自動刷新跑下一輪。
          </article>
        ) : null}
      </section>

      {message ? <p className="text-sm text-[var(--muted)]">{message}</p> : null}
    </div>
  );
}
