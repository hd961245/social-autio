"use client";

import { useState, useTransition } from "react";

export function WordPressConnectForm() {
  const [siteUrl, setSiteUrl] = useState("");
  const [username, setUsername] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [hints, setHints] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  return (
    <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
      <form
        className="grid gap-4 lg:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(async () => {
            const response = await fetch("/api/wordpress/connect", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ siteUrl, username, appPassword })
            });
            const result = await response.json();
            setHints(response.ok ? [] : result.hints ?? []);
            setMessage(response.ok ? "WordPress 已連接，可在 Compose 選擇使用。" : result.message ?? "連接失敗");
          });
        }}
      >
        <div className="lg:col-span-2">
          <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">WordPress Connect</p>
          <h2 className="mt-2 text-3xl font-semibold">接入部落格站台</h2>
        </div>
        <input
          className="rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-3"
          placeholder="https://your-site.com"
          value={siteUrl}
          onChange={(event) => setSiteUrl(event.target.value)}
          required
        />
        <input
          className="rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-3"
          placeholder="WordPress 登入帳號（不是顯示名稱）"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
        />
        <input
          className="rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-3 lg:col-span-2"
          placeholder="Application Password（不是一般登入密碼）"
          value={appPassword}
          onChange={(event) => setAppPassword(event.target.value)}
          required
        />
        <div className="lg:col-span-2 flex items-center gap-4">
          <button disabled={isPending} className="rounded-full bg-[var(--accent)] px-4 py-3 text-sm text-white">
            {isPending ? "連接中..." : "連接 WordPress"}
          </button>
          {message ? <p className="text-sm text-[var(--muted)]">{message}</p> : null}
        </div>
        {hints.length > 0 ? (
          <div className="lg:col-span-2 rounded-2xl border border-[var(--border)] bg-white/75 p-4 text-sm text-[var(--muted)]">
            <p className="font-medium text-[var(--foreground)]">排查建議</p>
            <ul className="mt-2 space-y-2">
              {hints.map((hint) => (
                <li key={hint}>- {hint}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </form>
    </section>
  );
}
