"use client";

import { useState, useTransition } from "react";

export function AutopilotEditorialControl({
  initialDirection,
  initialGoal
}: {
  initialDirection: string;
  initialGoal: string;
}) {
  const [direction, setDirection] = useState(initialDirection);
  const [goal, setGoal] = useState(initialGoal);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <section className="rounded-[1.6rem] border border-[var(--border)] bg-white/80 p-5">
      <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Site Direction</p>
      <h3 className="mt-2 text-2xl font-semibold">你只定方向，AI 自己每天生文</h3>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
        這裡是站台層的總方向。之後每日 autopilot 會先吃這裡，再套各 persona 的語氣與風格。也就是說，你不用每個帳號都交代一次，只要先把內容方向講清楚。
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <label className="rounded-[1.25rem] border border-[var(--border)] bg-[var(--surface)]/70 p-4">
          <span className="mb-2 block text-sm text-[var(--muted)]">現在的內容方向</span>
          <textarea
            className="min-h-32 w-full resize-none rounded-2xl border border-[var(--border)] bg-white p-4 outline-none"
            placeholder="例如：以理財新手決策為主，優先寫數位銀行、券商、ETF 入門，重點放在幫讀者縮短比較時間。"
            value={direction}
            onChange={(event) => setDirection(event.target.value)}
          />
        </label>

        <label className="rounded-[1.25rem] border border-[var(--border)] bg-[var(--surface)]/70 p-4">
          <span className="mb-2 block text-sm text-[var(--muted)]">希望達成的結果</span>
          <textarea
            className="min-h-32 w-full resize-none rounded-2xl border border-[var(--border)] bg-white p-4 outline-none"
            placeholder="例如：提高留言互動、帶回站內長文、建立專業感、讓人願意收藏。"
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={isPending}
          className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm text-white disabled:opacity-60"
          onClick={() => {
            startTransition(async () => {
              setMessage(null);
              const response = await fetch("/api/automation/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  editorialDirection: direction,
                  editorialGoal: goal
                })
              });
              const result = await response.json();
              setMessage(response.ok ? "已更新站台自動生文方向。" : result.message ?? "更新失敗");
            });
          }}
        >
          {isPending ? "儲存中..." : "儲存站台方向"}
        </button>
        <p className="text-sm text-[var(--muted)]">如果某個 persona 沒填自己的每日方向，系統會自動沿用這裡。</p>
      </div>

      {message ? <p className="mt-4 text-sm text-[var(--muted)]">{message}</p> : null}
    </section>
  );
}
