"use client";

import { useState, useTransition } from "react";

export function QueueActions() {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        disabled={isPending}
        className="rounded-full border border-[var(--border-strong)] bg-white/70 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() =>
          startTransition(async () => {
            setMessage(null);
            const response = await fetch("/api/scheduler/run-now", {
              method: "POST"
            });
            const result = await response.json();
            setMessage(result.message ?? (response.ok ? "已執行排程。" : "排程執行失敗"));
          })
        }
      >
        {isPending ? "執行中..." : "立即執行排程"}
      </button>
      <a href="/compose" className="rounded-full border border-[var(--border-strong)] bg-white/70 px-4 py-2 text-sm">
        建立新貼文
      </a>
      {message ? <p className="basis-full text-sm text-[var(--muted)]">{message}</p> : null}
    </div>
  );
}
