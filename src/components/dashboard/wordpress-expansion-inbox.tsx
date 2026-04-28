"use client";

import { useState, useTransition } from "react";

type ExpansionCandidate = {
  id: string;
  account: string;
  text: string;
  publishedAt: string;
  platformUrl: string | null;
  engagementRate: number;
  conversationRate: number;
  amplificationRate: number;
  momentumLabel: string;
  reason: string;
  recommendation: string;
};

export function WordPressExpansionInbox({ candidates }: { candidates: ExpansionCandidate[] }) {
  const [items, setItems] = useState(candidates);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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

      <div className="mt-6 grid gap-4">
        {items.map((item) => (
          <article key={item.id} className="rounded-[1.6rem] border border-[var(--border)] bg-white/75 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  {item.account} · {item.publishedAt}
                </p>
                <h3 className="mt-2 text-xl font-semibold">{item.text}</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="pill-tag">互動率 {(item.engagementRate * 100).toFixed(1)}%</span>
                  <span className="pill-tag">對話率 {(item.conversationRate * 100).toFixed(1)}%</span>
                  <span className="pill-tag">擴散率 {(item.amplificationRate * 100).toFixed(1)}%</span>
                  <span className="pill-tag">{item.momentumLabel}</span>
                </div>
                <p className="mt-4 text-sm leading-7 text-[var(--muted)]">{item.reason}</p>
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
                      const response = await fetch(`/api/posts/${item.id}/sync-wordpress`, { method: "POST" });
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
