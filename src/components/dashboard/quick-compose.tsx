"use client";

import { useState } from "react";

export function QuickCompose() {
  const [text, setText] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/posts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          textContent: text,
          // convert Taiwan time (local) to UTC
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null
        })
      });
      const data = await res.json();
      if (data.ok) {
        setMsg({ ok: true, text: `已儲存（${data.status}）` });
        setText("");
        setScheduledAt("");
      } else {
        setMsg({ ok: false, text: data.message ?? "失敗" });
      }
    } catch {
      setMsg({ ok: false, text: "網路錯誤" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="貼文內容…"
        rows={5}
        className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none focus:border-zinc-600"
      />
      <div className="flex items-center gap-3">
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-sm text-zinc-300 focus:outline-none focus:border-zinc-600"
        />
        <span className="text-xs text-zinc-600">留空 = 存草稿</span>
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="ml-auto px-4 py-1.5 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 rounded text-sm text-white transition-colors"
        >
          {loading ? "儲存中…" : "儲存"}
        </button>
      </div>
      {msg && (
        <p className={`text-xs ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</p>
      )}
    </form>
  );
}
