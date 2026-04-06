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
  platform?: string;
};

export function PostComposerForm({
  accounts,
  recentPosts
}: {
  accounts: AccountOption[];
  recentPosts: RecentPost[];
}) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [html, setHtml] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [featuredImageUrl, setFeaturedImageUrl] = useState("");
  const [categories, setCategories] = useState("");
  const [tags, setTags] = useState("");
  const [publishMode, setPublishMode] = useState<"immediate" | "scheduled">("immediate");
  const [scheduledAt, setScheduledAt] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedAccount = accounts.find((account) => account.id === accountId);
  const isWordPress = selectedAccount?.platform === "wordpress";
  const charactersLeft = 500 - text.length;

  return (
    <section className="glass-panel fade-in-up rounded-[2rem] border border-[var(--border)] p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Compose</p>
          <h2 className="mt-2 text-3xl font-semibold">跨平台發文編輯器</h2>
        </div>
        <span className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs uppercase tracking-[0.2em] text-white">
          phase 6
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
                  title: isWordPress ? title : undefined,
                  text,
                  html: isWordPress ? html : undefined,
                  excerpt: isWordPress ? excerpt : undefined,
                  mediaUrls: mediaUrl ? [mediaUrl] : [],
                  featuredImageUrl: isWordPress && featuredImageUrl ? featuredImageUrl : undefined,
                  categories: isWordPress
                    ? categories
                        .split(",")
                        .map((item) => item.trim())
                        .filter(Boolean)
                    : undefined,
                  tags: isWordPress
                    ? tags
                        .split(",")
                        .map((item) => item.trim())
                        .filter(Boolean)
                    : undefined,
                  contentType: mediaUrl ? "image" : "text",
                  publishMode,
                  scheduledAt: publishMode === "scheduled" ? new Date(scheduledAt).toISOString() : undefined
                })
              });

              const result = await response.json();

              if (!response.ok) {
                setMessage(result.message ?? "發文失敗，請稍後再試");
                return;
              }

              setMessage(
                publishMode === "scheduled"
                  ? "已加入排程佇列，稍後會由 scheduler 自動發布。"
                  : "已送出發布流程。重新整理後可在排程頁看到紀錄。"
              );
              setTitle("");
              setText("");
              setHtml("");
              setExcerpt("");
              setMediaUrl("");
              setFeaturedImageUrl("");
              setCategories("");
              setTags("");
              setScheduledAt("");
            });
          }}
        >
          {isWordPress ? (
            <div className="rounded-3xl bg-white/85 p-4">
              <label className="mb-2 block text-sm text-[var(--muted)]">文章標題</label>
              <input
                className="w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3 outline-none"
                placeholder="輸入文章標題"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required={isWordPress}
              />
            </div>
          ) : null}

          <div className="rounded-3xl bg-white/85 p-4">
            <label className="mb-2 block text-sm text-[var(--muted)]">
              {isWordPress ? "文章摘要 / 內文草稿" : "貼文內容"}
            </label>
            <textarea
              className="min-h-44 w-full resize-none rounded-2xl border border-[var(--border)] bg-transparent p-4 outline-none"
              placeholder={isWordPress ? "輸入文章摘要或內文描述" : "輸入貼文內容，最多 500 字元"}
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={isWordPress ? 100000 : 500}
              required
            />
            {!isWordPress ? <p className="mt-2 text-right text-xs text-[var(--muted)]">剩餘 {charactersLeft} 字</p> : null}
          </div>

          {isWordPress ? (
            <>
              <div className="rounded-3xl bg-white/85 p-4">
                <label className="mb-2 block text-sm text-[var(--muted)]">HTML 內容</label>
                <textarea
                  className="min-h-52 w-full resize-none rounded-2xl border border-[var(--border)] bg-transparent p-4 outline-none"
                  placeholder="<p>可直接貼 HTML 或留空讓系統自動轉段落</p>"
                  value={html}
                  onChange={(event) => setHtml(event.target.value)}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl bg-white/85 p-4">
                  <label className="mb-2 block text-sm text-[var(--muted)]">摘要</label>
                  <textarea
                    className="min-h-28 w-full resize-none rounded-2xl border border-[var(--border)] bg-transparent p-4 outline-none"
                    placeholder="文章摘要"
                    value={excerpt}
                    onChange={(event) => setExcerpt(event.target.value)}
                  />
                </div>
                <div className="rounded-3xl bg-white/85 p-4">
                  <label className="mb-2 block text-sm text-[var(--muted)]">特色圖片 URL</label>
                  <input
                    className="w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3 outline-none"
                    placeholder="https://..."
                    value={featuredImageUrl}
                    onChange={(event) => setFeaturedImageUrl(event.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl bg-white/85 p-4">
                  <label className="mb-2 block text-sm text-[var(--muted)]">分類</label>
                  <input
                    className="w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3 outline-none"
                    placeholder="產品更新, 教學"
                    value={categories}
                    onChange={(event) => setCategories(event.target.value)}
                  />
                </div>
                <div className="rounded-3xl bg-white/85 p-4">
                  <label className="mb-2 block text-sm text-[var(--muted)]">標籤</label>
                  <input
                    className="w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3 outline-none"
                    placeholder="threads, growth, audio"
                    value={tags}
                    onChange={(event) => setTags(event.target.value)}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-3xl bg-white/85 p-4">
              <label className="mb-2 block text-sm text-[var(--muted)]">媒體 URL</label>
              <input
                className="w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3 outline-none"
                placeholder="https://..."
                value={mediaUrl}
                onChange={(event) => setMediaUrl(event.target.value)}
              />
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="rounded-3xl bg-white/85 p-4">
              <span className="mb-2 block text-sm text-[var(--muted)]">發佈模式</span>
              <select
                className="w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3 outline-none"
                value={publishMode}
                onChange={(event) => setPublishMode(event.target.value as "immediate" | "scheduled")}
              >
                <option value="immediate">立即發佈</option>
                <option value="scheduled">排程發佈</option>
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

          <button
            type="submit"
            disabled={isPending || !accountId}
            className="w-full rounded-2xl bg-[var(--accent)] px-4 py-3 text-white shadow-[0_16px_40px_rgba(187,90,54,0.24)] disabled:opacity-60"
          >
            {isPending ? "送出中..." : publishMode === "scheduled" ? "加入排程" : isWordPress ? "發佈文章" : "立即發文"}
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
              類型：{isWordPress ? "文章 / 摘要 / 分類 / 標籤 / 特色圖" : "文字 / 單一媒體 / 排程回覆"}
            </div>
            <div className="rounded-2xl border border-white/10 p-3">
              {isWordPress ? "WordPress 會自動建立分類與標籤，並嘗試上傳特色圖。" : "Hashtag：Threads 上限 1 個"}
            </div>
            <div className="rounded-2xl border border-white/10 p-3">
              {isWordPress ? "排程會先進本地佇列，到時間由 scheduler 發佈。" : "關鍵字命中可直接生成自動回覆佇列"}
            </div>
          </div>

          <div className="mt-6">
            <p className="text-sm text-white/70">最近建立</p>
            <div className="mt-3 space-y-3">
              {recentPosts.map((post) => (
                <div key={post.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/55">
                    {post.account}
                    {post.platform ? ` · ${post.platform}` : ""} · {post.status}
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
