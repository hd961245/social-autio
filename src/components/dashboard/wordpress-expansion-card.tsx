"use client";

import { useState, useTransition } from "react";

export function WordPressExpansionCard({
  postId,
  eligible,
  reason,
  recommendation
}: {
  postId: string;
  eligible: boolean;
  reason: string;
  recommendation: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <article className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
      <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">WordPress Expansion</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h2 className="text-3xl font-semibold">這篇值不值得沉成長文</h2>
        <span
          className={`rounded-full border px-3 py-1 text-xs ${
            eligible
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-stone-200 bg-stone-100 text-stone-700"
          }`}
        >
          {eligible ? "適合延伸" : "先觀察"}
        </span>
      </div>
      <p className="mt-5 text-sm leading-7 text-[var(--muted)]">{reason}</p>
      <div className="mt-4 rounded-[1.2rem] border border-[var(--border)] bg-white/72 px-4 py-4">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">建議方向</p>
        <p className="mt-2 text-sm leading-7 text-[var(--foreground)]">{recommendation}</p>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          disabled={isPending}
          className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm text-white disabled:opacity-60"
          onClick={() =>
            startTransition(async () => {
              setMessage(null);
              const response = await fetch(`/api/posts/${postId}/sync-wordpress`, {
                method: "POST"
              });
              const result = await response.json();
              setMessage(result.message ?? (response.ok ? "已建立 WordPress 草稿。" : "建立草稿失敗"));
            })
          }
        >
          {isPending ? "建立中..." : "轉成 WordPress 草稿"}
        </button>
        <a href="/wordpress" className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm">
          去 WordPress 工作區
        </a>
      </div>
      {message ? <p className="mt-4 text-sm text-[var(--muted)]">{message}</p> : null}
    </article>
  );
}
