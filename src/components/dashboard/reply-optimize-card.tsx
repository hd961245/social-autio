"use client";

import { useState, useTransition } from "react";

type ReplySample = {
  id: string;
  username: string;
  text: string;
  timestamp: string;
};

export function ReplyOptimizeCard({
  postId,
  replies
}: {
  postId: string;
  replies: ReplySample[];
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [insights, setInsights] = useState<{
    provider: string;
    summary: string;
    tension: string;
    opportunity: string;
    followUpAngle: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Reply Signals</p>
          <h2 className="mt-2 text-3xl font-semibold">根據留言生成下一版</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
            把這篇底下已經出現的疑問、反對點、延伸需求餵給 AI，直接生成一篇更適合二次發布的 Threads 草稿。
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isPending || replies.length === 0}
            className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm disabled:opacity-60"
            onClick={() => {
              startTransition(async () => {
                setMessage(null);
                const response = await fetch(`/api/posts/${postId}/reply-insights`, {
                  method: "POST"
                });
                const result = await response.json();

                if (!response.ok) {
                  setMessage(result.message ?? "留言洞察生成失敗");
                  return;
                }

                setInsights(result.result);
                setMessage(`已根據 ${result.replyCount} 則留言整理出 AI 洞察。`);
              });
            }}
          >
            {isPending ? "整理中..." : "AI 幫我整理留言洞察"}
          </button>
          <button
            type="button"
            disabled={isPending || replies.length === 0}
            className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm text-white disabled:opacity-60"
            onClick={() => {
              startTransition(async () => {
                setMessage(null);
                const response = await fetch(`/api/posts/${postId}/optimize-from-replies`, {
                  method: "POST"
                });
                const result = await response.json();

                if (!response.ok) {
                  setMessage(result.message ?? "生成優化版失敗");
                  return;
                }

                setMessage(`已根據 ${result.replyCount} 則留言建立新草稿，現在帶你去 Compose。`);
                window.location.href = `/compose?postId=${result.draftId}`;
              });
            }}
          >
            {isPending ? "生成中..." : "根據留言生成優化版"}
          </button>
          <button
            type="button"
            disabled={isPending || replies.length === 0}
            className="rounded-full border border-[var(--accent)] px-4 py-2 text-sm text-[var(--accent)] disabled:opacity-60"
            onClick={() => {
              startTransition(async () => {
                setMessage(null);
                const response = await fetch(`/api/posts/${postId}/optimize-from-replies`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ mode: "scheduled" })
                });
                const result = await response.json();

                if (!response.ok) {
                  setMessage(result.message ?? "排程 follow-up 失敗");
                  return;
                }

                setMessage(
                  `已根據 ${result.replyCount} 則留言建立 follow-up，並排進 ${result.scheduledForLabel ?? "即刻"} 的發文佇列。`
                );
              });
            }}
          >
            {isPending ? "排程中..." : "根據留言生成並排程"}
          </button>
        </div>
      </div>

      {insights ? (
        <div className="mt-6 grid gap-3 lg:grid-cols-2">
          <article className="rounded-[1.2rem] border border-[var(--border)] bg-white/72 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">Summary</p>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{insights.summary}</p>
          </article>
          <article className="rounded-[1.2rem] border border-[var(--border)] bg-white/72 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">Tension</p>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{insights.tension}</p>
          </article>
          <article className="rounded-[1.2rem] border border-[var(--border)] bg-white/72 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">Opportunity</p>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{insights.opportunity}</p>
          </article>
          <article className="rounded-[1.2rem] border border-[var(--border)] bg-white/72 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">Follow-up Angle</p>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{insights.followUpAngle}</p>
          </article>
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        {replies.length === 0 ? (
          <p className="rounded-[1.2rem] border border-[var(--border)] bg-white/72 px-4 py-4 text-sm text-[var(--muted)]">
            目前還抓不到可用留言。等這篇貼文累積一些回覆後，再用這裡生成 follow-up 會比較準。
          </p>
        ) : (
          replies.map((reply) => (
            <article key={reply.id} className="rounded-[1.2rem] border border-[var(--border)] bg-white/72 px-4 py-4">
              <div className="flex flex-wrap items-center gap-3">
                <p className="font-medium">@{reply.username}</p>
                <p className="text-sm text-[var(--muted)]">{reply.timestamp}</p>
              </div>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{reply.text}</p>
            </article>
          ))
        )}
      </div>

      {message ? <p className="mt-4 text-sm text-[var(--muted)]">{message}</p> : null}
    </section>
  );
}
