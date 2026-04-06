"use client";

import { useState, useTransition } from "react";
import type { KeywordHitSummary } from "@/lib/dashboard-data";

export function KeywordTable({ hits }: { hits: KeywordHitSummary[] }) {
  const [items, setItems] = useState(hits);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <section className="glass-panel fade-in-up rounded-[2rem] border border-[var(--border)] p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Keyword Monitor</p>
          <h2 className="mt-2 text-3xl font-semibold">近期命中</h2>
        </div>
        <form action="/api/cron/keywords" method="post">
          <button className="rounded-full border border-[var(--border-strong)] bg-white/70 px-4 py-2 text-sm">
            立即掃描
          </button>
        </form>
      </div>

      <div className="mt-6 overflow-hidden rounded-3xl border border-[var(--border)] bg-white/65">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-white/70 text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Keyword</th>
              <th className="px-4 py-3 font-medium">Author</th>
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((hit) => (
              <tr key={hit.id} className="border-t border-[var(--border)]">
                <td className="px-4 py-4 align-top">
                  <p className="font-medium">{hit.keyword}</p>
                  <p className="mt-1 text-[var(--muted)]">{hit.excerpt}</p>
                </td>
                <td className="px-4 py-4 align-top">{hit.author}</td>
                <td className="px-4 py-4 align-top">{hit.matchedAt}</td>
                <td className="px-4 py-4 align-top">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs text-[var(--accent-strong)]">
                      {hit.actionTaken}
                    </span>
                    <button
                      disabled={isPending || !hit.id}
                      className="rounded-full border border-[var(--border)] px-3 py-1 text-xs"
                      onClick={() =>
                        startTransition(async () => {
                          const response = await fetch(`/api/keywords/matches/${hit.id}/reply`, {
                            method: "POST"
                          });
                          const result = await response.json();
                          setMessage(result.message ?? (response.ok ? "已建立手動回覆。" : "操作失敗"));
                          if (response.ok) {
                            setItems((current) =>
                              current.map((item) =>
                                item.id === hit.id ? { ...item, actionTaken: "manual_reply" } : item
                              )
                            );
                          }
                        })
                      }
                    >
                      快速回覆
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr className="border-t border-[var(--border)]">
                <td colSpan={4} className="px-4 py-8 text-center text-[var(--muted)]">
                  尚未有關鍵字命中資料
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {message ? <p className="mt-3 text-sm text-[var(--muted)]">{message}</p> : null}
    </section>
  );
}
