"use client";

import { useMemo, useState, useTransition } from "react";

type ExpansionCandidate = {
  id: string;
  account: string;
  text: string;
  publishedAt: string;
  platformUrl: string | null;
  views: number;
  replies: number;
  engagementRate: number;
  conversationRate: number;
  amplificationRate: number;
  momentumLabel: string;
  longformScore: number;
  suggestedTitle: string;
  reason: string;
  recommendation: string;
};

export function WordPressExpansionInbox({ candidates }: { candidates: ExpansionCandidate[] }) {
  const [items, setItems] = useState(candidates);
  const [message, setMessage] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"score" | "conversation" | "engagement" | "latest">("score");
  const [isPending, startTransition] = useTransition();
  const sortedItems = useMemo(() => {
    const next = [...items];

    next.sort((left, right) => {
      if (sortBy === "conversation") {
        return right.conversationRate - left.conversationRate;
      }

      if (sortBy === "engagement") {
        return right.engagementRate - left.engagementRate;
      }

      if (sortBy === "latest") {
        return right.publishedAt.localeCompare(left.publishedAt);
      }

      return right.longformScore - left.longformScore;
    });

    return next;
  }, [items, sortBy]);
  const maxScore = Math.max(1, ...sortedItems.map((item) => item.longformScore));

  return (
    <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Expansion Inbox</p>
          <h2 className="mt-2 text-3xl font-semibold">值得沉成長文的 Threads</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
            這裡只收還沒同步成 WordPress 草稿、但互動與討論已經夠好的 Threads。平常不用逐篇翻，直接從這裡挑今天要沉澱的題目。
          </p>
        </div>
        <div className="rounded-[1.2rem] border border-[var(--border)] bg-white/72 px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">待擴寫</p>
          <p className="mt-2 text-3xl font-semibold">{items.length}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "平均長文分數", value: items.length ? Math.round(items.reduce((sum, item) => sum + item.longformScore, 0) / items.length) : 0 },
            { label: "平均互動率", value: `${items.length ? (items.reduce((sum, item) => sum + item.engagementRate, 0) / items.length * 100).toFixed(1) : "0.0"}%` },
            { label: "平均留言數", value: items.length ? Math.round(items.reduce((sum, item) => sum + item.replies, 0) / items.length) : 0 }
          ].map((card) => (
            <article key={card.label} className="metric-card">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">{card.label}</p>
              <p className="mt-3 text-3xl font-semibold">{card.value}</p>
            </article>
          ))}
        </div>
        <article className="rounded-[1.5rem] border border-[var(--border)] bg-white/72 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">長文潛力排序</p>
            <select
              className="rounded-full border border-[var(--border)] bg-white px-3 py-2 text-sm"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as "score" | "conversation" | "engagement" | "latest")}
            >
              <option value="score">依綜合分數</option>
              <option value="conversation">依對話率</option>
              <option value="engagement">依互動率</option>
              <option value="latest">依最新發布</option>
            </select>
          </div>
          <div className="mt-4 space-y-3">
            {sortedItems.slice(0, 5).map((item) => (
              <div key={item.id} className="grid grid-cols-[88px_1fr_56px] items-center gap-3 text-sm">
                <span className="text-[var(--muted)]">{item.account}</span>
                <div className="rounded-full bg-white p-1">
                  <div
                    className="h-3 rounded-full bg-[var(--accent)]"
                    style={{ width: `${(item.longformScore / maxScore) * 100}%` }}
                  />
                </div>
                <span className="text-right font-medium text-[var(--foreground)]">{item.longformScore}</span>
              </div>
            ))}
            {sortedItems.length === 0 ? <p className="text-sm text-[var(--muted)]">目前還沒有可排序的擴寫候選。</p> : null}
          </div>
        </article>
      </div>

      <div className="mt-6 grid gap-4">
        {sortedItems.map((item) => (
          <article key={item.id} className="rounded-[1.6rem] border border-[var(--border)] bg-white/75 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  {item.account} · {item.publishedAt}
                </p>
                <h3 className="mt-2 text-xl font-semibold">{item.text}</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="pill-tag">長文分數 {item.longformScore}</span>
                  <span className="pill-tag">Views {item.views}</span>
                  <span className="pill-tag">留言 {item.replies}</span>
                  <span className="pill-tag">互動率 {(item.engagementRate * 100).toFixed(1)}%</span>
                  <span className="pill-tag">對話率 {(item.conversationRate * 100).toFixed(1)}%</span>
                  <span className="pill-tag">擴散率 {(item.amplificationRate * 100).toFixed(1)}%</span>
                  <span className="pill-tag">{item.momentumLabel}</span>
                </div>
                <p className="mt-4 text-sm leading-7 text-[var(--muted)]">{item.reason}</p>
                <div className="mt-3 rounded-[1.2rem] border border-[var(--border)] bg-[rgba(249,245,238,0.82)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">建議長文標題</p>
                  <p className="mt-2 text-sm font-medium leading-7 text-[var(--foreground)]">{item.suggestedTitle}</p>
                </div>
                <p className="mt-3 text-sm leading-7 text-[var(--foreground)]">{item.recommendation}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-3">
                {item.platformUrl ? (
                  <a href={item.platformUrl} target="_blank" rel="noreferrer" className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm">
                    看原文
                  </a>
                ) : null}
                <a href={`/posts/${item.id}`} className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm">
                  看復盤
                </a>
                <button
                  disabled={isPending}
                  className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm text-white disabled:opacity-60"
                  onClick={() =>
                    startTransition(async () => {
                      setMessage(null);
                      const response = await fetch(`/api/posts/${item.id}/sync-wordpress`, {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                          titleOverride: item.suggestedTitle
                        })
                      });
                      const result = await response.json();

                      if (response.ok) {
                        setItems((current) => current.filter((candidate) => candidate.id !== item.id));
                      }

                      setMessage(result.message ?? (response.ok ? "已建立 WordPress 草稿。" : "建立草稿失敗"));
                    })
                  }
                >
                  {isPending ? "建立中..." : "轉成 WordPress 草稿"}
                </button>
              </div>
            </div>
          </article>
        ))}
        {items.length === 0 ? (
          <article className="rounded-[1.6rem] border border-dashed border-[var(--border)] p-5 text-sm text-[var(--muted)]">
            目前沒有新的高表現 Threads 待擴寫。等今天有貼文起來後，這裡會自動浮出下一批題目。
          </article>
        ) : null}
      </div>
      {message ? <p className="mt-4 text-sm text-[var(--muted)]">{message}</p> : null}
    </section>
  );
}
