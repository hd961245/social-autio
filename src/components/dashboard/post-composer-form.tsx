"use client";

import { useState, useTransition } from "react";

type AccountOption = {
  id: string;
  username: string;
  platform: string;
};

type RecentPost = {
  id: string;
  status: string;
  text: string;
  account: string;
};

export function PostComposerForm({
  accounts,
  recentPosts
}: {
  accounts: AccountOption[];
  recentPosts: RecentPost[];
}) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [text, setText] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [publishMode, setPublishMode] = useState<"immediate" | "scheduled">("immediate");
  const [scheduledAt, setScheduledAt] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const charactersLeft = 500 - text.length;
  const selectedAccount = accounts.find((account) => account.id === accountId);
  const isWordPress = selectedAccount?.platform === "wordpress";

  return (
    <section className="glass-panel fade-in-up rounded-[2rem] border border-[var(--border)] p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Compose</p>
          <h2 className="mt-2 text-3xl font-semibold">Threads 發文編輯器</h2>
        </div>
        <span className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs uppercase tracking-[0.2em] text-white">
          v1
        </span>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();

            startTransition(async () => {
              setMessage(null);

              const response = await fetch("/api/threads/publish", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  accountId,
                  text,
                  mediaUrls: mediaUrl ? [mediaUrl] : [],
                  contentType: mediaUrl ? "image" : "text",
                  publishMode,
                  scheduledAt: publishMode === "scheduled" ? scheduledAt : undefined
                })
              });

              const result = await response.json();

              if (!response.ok) {
                setMessage(result.message ?? "發文失敗，請稍後再試");
                return;
              }

              setMessage("已建立貼文並送出第一版發布流程。重新整理後可在排程頁看到紀錄。");
              setText("");
              setMediaUrl("");
              setScheduledAt("");
            });
          }}
        >
          <div className="rounded-3xl bg-white/85 p-4">
            <label className="mb-2 block text-sm text-[var(--muted)]">貼文內容</label>
            <textarea
              className="min-h-44 w-full resize-none rounded-2xl border border-[var(--border)] bg-transparent p-4 outline-none"
              placeholder="輸入貼文內容，最多 500 字元"
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={500}
              required
            />
            <p className="mt-2 text-right text-xs text-[var(--muted)]">剩餘 {charactersLeft} 字</p>
          </div>
          <div className="rounded-3xl bg-white/85 p-4">
            <label className="mb-2 block text-sm text-[var(--muted)]">媒體 URL</label>
            <input
              className="w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3 outline-none"
              placeholder="https://..."
              value={mediaUrl}
              onChange={(event) => setMediaUrl(event.target.value)}
            />
          </div>
          {!isWordPress ? (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="rounded-3xl bg-white/85 p-4">
                <span className="mb-2 block text-sm text-[var(--muted)]">發佈模式</span>
                <select
                  className="w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3 outline-none"
                  value={publishMode}
                  onChange={(event) => setPublishMode(event.target.value as "immediate" | "scheduled")}
                >
                  <option value="immediate">立即發文</option>
                  <option value="scheduled">排程發文</option>
                </select>
              </label>
              <label className="rounded-3xl bg-white/85 p-4">
                <span className="mb-2 block text-sm text-[var(--muted)]">排程時間</span>
                <input
                  type="datetime-local"
                  className="w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3 outline-none"
                  value={scheduledAt}
                  onChange={(event) => setScheduledAt(event.target.value)}
                  disabled={publishMode !== "scheduled"}
                />
              </label>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isPending || !accountId}
            className="w-full rounded-2xl bg-[var(--accent)] px-4 py-3 text-white shadow-[0_16px_40px_rgba(187,90,54,0.24)] disabled:opacity-60"
          >
            {isPending ? "送出中..." : "立即發文"}
          </button>
          {message ? <p className="text-sm text-[var(--muted)]">{message}</p> : null}
        </form>

        <div className="rounded-3xl bg-[var(--card-dark)] p-4 text-white">
          <p className="text-sm text-white/70">發文選項</p>
            <div className="mt-4 space-y-3 text-sm">
            <label className="block">
              <span className="mb-2 block text-white/60">帳號</span>
              <select
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
                value={accountId}
                onChange={(event) => setAccountId(event.target.value)}
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.platform} {account.username}
                  </option>
                ))}
              </select>
            </label>
            <div className="rounded-2xl border border-white/10 p-3">
              類型：{isWordPress ? "文章內容 / 直接發布" : "文字 / 單一媒體 / 排程第一版"}
            </div>
            <div className="rounded-2xl border border-white/10 p-3">
              {isWordPress ? "WordPress 會用第一行作為文章標題" : "Hashtag：Threads 上限 1 個"}
            </div>
            <div className="rounded-2xl border border-white/10 p-3">
              {isWordPress ? "透過 Application Password 發布文章" : "模式：立即發文或排程發文"}
            </div>
          </div>

          <div className="mt-6">
            <p className="text-sm text-white/70">最近建立</p>
            <div className="mt-3 space-y-3">
              {recentPosts.map((post) => (
                <div key={post.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/55">
                    {post.account} · {post.status}
                  </p>
                  <p className="mt-2 line-clamp-3 text-sm">{post.text}</p>
                </div>
              ))}
              {recentPosts.length === 0 ? (
                <p className="rounded-2xl border border-white/10 p-3 text-sm text-white/55">
                  目前還沒有貼文紀錄
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
