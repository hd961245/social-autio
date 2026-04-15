"use client";

import { useState, useTransition } from "react";
import type { AffiliateLibrary } from "@/lib/content/wordpress-templates";

const wordpressTemplates = [
  {
    id: "opinion",
    label: "觀點文",
    html: `<h2>先說觀點</h2>
<p>先用一段話講清楚你的判斷。</p>
<h2>背景與脈絡</h2>
<p>補上事件背景、趨勢或市場情境。</p>
<h2>我會怎麼看</h2>
<p>放進你的分析、立場與延伸觀察。</p>
<h2>推薦工具 / 聯盟連結插槽</h2>
<ul>
  <li>主推薦工具：待填寫</li>
  <li>延伸閱讀或替代方案：待填寫</li>
  <li>Disclosure：若含聯盟連結，正式發佈前請補上揭露。</li>
</ul>
<h2>最後 CTA</h2>
<p>補上你希望讀者採取的下一步。</p>`
  },
  {
    id: "case-study",
    label: "案例拆解",
    html: `<h2>案例概覽</h2>
<p>快速說明這次案例是什麼、為什麼值得拆。</p>
<h2>拆解過程</h2>
<p>逐段分析操作方式、切角或節奏。</p>
<h2>可複製的關鍵</h2>
<ul>
  <li>做對了什麼</li>
  <li>哪裡有機會優化</li>
  <li>你可以怎麼套用</li>
</ul>
<h2>推薦工具 / 聯盟連結插槽</h2>
<p>這裡放可搭配案例一起推薦的工具、課程或服務。</p>
<h2>結尾 CTA</h2>
<p>邀請讀者延伸閱讀、追蹤或留言。</p>`
  },
  {
    id: "tool-review",
    label: "工具推薦",
    html: `<h2>這個工具值不值得用</h2>
<p>先給結論與適用人群。</p>
<h2>實際使用感受</h2>
<p>講清楚優點、缺點與真實情境。</p>
<h2>適合誰 / 不適合誰</h2>
<ul>
  <li>適合：待補</li>
  <li>不適合：待補</li>
  <li>替代方案：待補</li>
</ul>
<h2>推薦工具 / 聯盟連結插槽</h2>
<p>這裡保留產品連結、聯盟連結、折扣資訊與揭露說明。</p>
<h2>最後 CTA</h2>
<p>如果要試用，這裡補上導購與下一步。</p>`
  },
  {
    id: "weekly-recap",
    label: "週報 Recap",
    html: `<h2>這週重點</h2>
<p>整理本週最值得記下的觀察。</p>
<h2>值得延伸的事情</h2>
<p>列出幾個值得追的訊號、文章或實驗。</p>
<h2>推薦工具 / 聯盟連結插槽</h2>
<p>這裡可以放本週使用到的工具、資源或推廣連結。</p>
<h2>下週方向</h2>
<p>下一步你打算怎麼做，或讀者可以怎麼延伸。</p>`
  }
] as const;

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

type DraftPost = {
  id: string;
  accountId: string;
  platform: string;
  title: string;
  text: string;
  html: string;
  excerpt: string;
  mediaUrl: string;
  featuredImageUrl: string;
  categories: string;
  tags: string;
  status: string;
  scheduledAt: string;
};

type ReviewContext = {
  sourcePostId: string;
  account: string;
  nextAction: string;
  momentumLabel: string;
  insights: string[];
};

export function PostComposerForm({
  accounts,
  recentPosts,
  affiliateLibrary,
  initialDraft,
  initialSeed,
  reviewContext,
  preferredAccountId
}: {
  accounts: AccountOption[];
  recentPosts: RecentPost[];
  affiliateLibrary: AffiliateLibrary;
  initialDraft?: DraftPost | null;
  initialSeed?: DraftPost | null;
  reviewContext?: ReviewContext | null;
  preferredAccountId?: string;
}) {
  const baseDraft = initialDraft ?? initialSeed ?? null;
  const [accountId, setAccountId] = useState(baseDraft?.accountId ?? preferredAccountId ?? accounts[0]?.id ?? "");
  const [title, setTitle] = useState(baseDraft?.title ?? "");
  const [text, setText] = useState(baseDraft?.text ?? "");
  const [html, setHtml] = useState(baseDraft?.html ?? "");
  const [excerpt, setExcerpt] = useState(baseDraft?.excerpt ?? "");
  const [mediaUrl, setMediaUrl] = useState(baseDraft?.mediaUrl ?? "");
  const [featuredImageUrl, setFeaturedImageUrl] = useState(baseDraft?.featuredImageUrl ?? "");
  const [categories, setCategories] = useState(baseDraft?.categories ?? "");
  const [tags, setTags] = useState(baseDraft?.tags ?? "");
  const [selectedTemplate, setSelectedTemplate] = useState<(typeof wordpressTemplates)[number]["id"]>("opinion");
  const [publishMode, setPublishMode] = useState<"immediate" | "scheduled">(
    initialDraft?.status === "scheduled" ? "scheduled" : "immediate"
  );
  const [scheduledAt, setScheduledAt] = useState(initialDraft?.scheduledAt ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedAccount = accounts.find((account) => account.id === accountId);
  const isWordPress = selectedAccount?.platform === "wordpress";
  const reviewBrief = reviewContext
    ? [`重寫方向：${reviewContext.nextAction}`, ...reviewContext.insights.map((insight, index) => `${index + 1}. ${insight}`)].join("\n")
    : "";
  const affiliateBlock = `<h2>推薦工具 / 聯盟連結插槽</h2>
<ul>
  <li>主推薦連結：${affiliateLibrary.primary || "待填寫"}</li>
  <li>備用推薦或延伸閱讀：${affiliateLibrary.secondary || "待填寫"}</li>
  <li>Disclosure：${affiliateLibrary.disclosure || "若本文含聯盟連結，正式發佈前請補上合適揭露。"}</li>
</ul>
<p>${affiliateLibrary.cta || "這裡補上一段導購 CTA 或下一步。"}</p>`;
  const charactersLeft = 500 - text.length;
  const threadPreview = `${text}${mediaUrl ? `\n\n${mediaUrl}` : ""}`.trim();
  const wordpressPreviewTitle = title || "未命名草稿";
  const wordpressPreviewBody = html || text;

  return (
    <section className="glass-panel fade-in-up rounded-[2rem] border border-[var(--border)] p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Compose</p>
          <h2 className="mt-2 text-3xl font-semibold">{initialDraft ? "回到草稿繼續修" : "Threads 發文台 + WordPress 草稿台"}</h2>
        </div>
        <span className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs uppercase tracking-[0.2em] text-white">
          {initialDraft ? "edit mode" : initialSeed ? "rewrite seed" : "threads first"}
        </span>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();

            startTransition(async () => {
              setMessage(null);

              const endpoint = initialDraft ? `/api/posts/${initialDraft.id}` : "/api/threads/publish";
              const response = await fetch(endpoint, {
                method: initialDraft ? "PATCH" : "POST",
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
                result.message ??
                  (isWordPress
                    ? "已同步到 WordPress 草稿。"
                    : publishMode === "scheduled"
                      ? "已加入 Threads 排程佇列。"
                      : "已更新 Threads 草稿。")
              );

              if (!initialDraft) {
                setTitle("");
                setText("");
                setHtml("");
                setExcerpt("");
                setMediaUrl("");
                setFeaturedImageUrl("");
                setCategories("");
                setTags("");
                setScheduledAt("");
              }
            });
          }}
        >
          {initialDraft ? (
            <div className="rounded-3xl border border-[var(--border-strong)] bg-[var(--accent-soft)] p-4 text-sm text-[var(--foreground)]">
              正在編輯：
              <span className="ml-2 font-semibold">{initialDraft.platform === "wordpress" ? "WordPress 草稿" : "Threads 草稿"}</span>
            </div>
          ) : null}
          {!initialDraft && initialSeed ? (
            <div className="rounded-3xl border border-[var(--border-strong)] bg-[var(--accent-soft)] p-4 text-sm text-[var(--foreground)]">
              已帶入一篇已發布內容作為新稿底本。這次會建立新的 Threads 草稿，不會回寫原本那篇。
            </div>
          ) : null}
          {reviewContext ? (
            <div className="rounded-3xl border border-[var(--border-strong)] bg-[rgba(200,79,44,0.08)] p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">Editor Review Mode</p>
                  <h3 className="mt-2 text-xl font-semibold">{reviewContext.account} · {reviewContext.momentumLabel}</h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{reviewContext.nextAction}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-full bg-[var(--card-dark)] px-4 py-2 text-sm text-white"
                    onClick={() => {
                      if (isWordPress) {
                        setHtml((current) =>
                          `<h2>這篇延伸要怎麼寫</h2>\n<p>${reviewContext.nextAction}</p>\n<ul>\n${reviewContext.insights
                            .map((insight) => `<li>${insight}</li>`)
                            .join("\n")}\n</ul>\n\n${current}`.trim()
                        );
                      } else {
                        setText((current) =>
                          [`先說這篇想延伸的重點：`, reviewContext.nextAction, "", current].filter(Boolean).join("\n")
                        );
                      }
                    }}
                  >
                    套用重寫骨架
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm"
                    onClick={() => {
                      if (isWordPress) {
                        setExcerpt((current) => (current ? `${current}\n${reviewContext.nextAction}` : reviewContext.nextAction));
                      } else {
                        setText((current) => `${current}${current ? "\n\n" : ""}${reviewBrief}`.trim());
                      }
                    }}
                  >
                    帶入編輯備忘
                  </button>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm text-[var(--muted)]">
                {reviewContext.insights.map((insight) => (
                  <p key={insight} className="rounded-[1rem] border border-[var(--border)] bg-white/72 px-3 py-2">
                    {insight}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <label className="rounded-3xl bg-white/85 p-4">
              <span className="mb-2 block text-sm text-[var(--muted)]">發布帳號</span>
              <select
                className="w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3 outline-none"
                value={accountId}
                onChange={(event) => setAccountId(event.target.value)}
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.platform === "threads" ? "Threads" : "WordPress"} {account.username}
                  </option>
                ))}
              </select>
            </label>
            <div className="rounded-3xl border border-[var(--border-strong)] bg-[rgba(200,79,44,0.08)] px-4 py-4 text-sm text-[var(--foreground)] md:min-w-[180px]">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">Current Mode</p>
              <p className="mt-2 text-base font-semibold">{isWordPress ? "WordPress Draft" : "Threads Publish"}</p>
              <p className="mt-2 leading-6 text-[var(--muted)]">
                {isWordPress ? "只會更新後台草稿，不直接發布。" : "可立即發布或加入排程。"}
              </p>
            </div>
          </div>
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
                <div className="mt-4 flex flex-wrap gap-2">
                  {wordpressTemplates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      className={`rounded-full px-4 py-2 text-sm ${
                        selectedTemplate === template.id
                          ? "bg-[var(--card-dark)] text-white"
                          : "border border-[var(--border)] bg-white text-[var(--foreground)]"
                      }`}
                      onClick={() => {
                        setSelectedTemplate(template.id);
                        setHtml(template.html);
                      }}
                    >
                      套用 {template.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="rounded-full border border-[var(--border-strong)] bg-[var(--accent-soft)] px-4 py-2 text-sm text-[var(--foreground)]"
                    onClick={() => setHtml((current) => `${current.trim()}\n\n${affiliateBlock}`.trim())}
                  >
                    插入聯盟連結區塊
                  </button>
                </div>
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

          {isWordPress ? (
            <div className="rounded-3xl bg-white/85 p-4 text-sm text-[var(--muted)]">
              WordPress 現在只會建立或更新草稿，不會直接發佈。你可以先在這裡修內容，再到站台裡細修版型。
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="rounded-3xl bg-white/85 p-4">
                <span className="mb-2 block text-sm text-[var(--muted)]">發佈模式</span>
                <select
                  className="w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3 outline-none"
                  value={publishMode}
                  onChange={(event) => setPublishMode(event.target.value as "immediate" | "scheduled")}
                >
                  <option value="immediate">{initialDraft ? "先存草稿" : "立即發佈"}</option>
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
          )}

          <button
            type="submit"
            disabled={isPending || !accountId}
            className="w-full rounded-2xl bg-[var(--accent)] px-4 py-3 text-white shadow-[0_16px_40px_rgba(187,90,54,0.24)] disabled:opacity-60"
          >
            {isPending
              ? "送出中..."
              : isWordPress
                ? initialDraft
                  ? "更新 WordPress 草稿"
                  : "建立 WordPress 草稿"
                : publishMode === "scheduled"
                  ? "加入排程"
                  : initialDraft
                    ? "更新 Threads 草稿"
                    : "立即發文"}
          </button>
          {message ? <p className="text-sm text-[var(--muted)]">{message}</p> : null}
        </form>

        <div className="space-y-4">
          {reviewContext ? (
            <div className="rounded-3xl bg-[var(--card-dark)] p-4 text-white">
              <p className="text-sm text-white/70">Review Brief</p>
              <p className="mt-3 text-base leading-7 text-white/82">{reviewContext.nextAction}</p>
              <div className="mt-4 space-y-2 text-sm text-white/70">
                {reviewContext.insights.map((insight) => (
                  <p key={insight}>- {insight}</p>
                ))}
              </div>
            </div>
          ) : null}
          <div className="rounded-3xl bg-[var(--card-dark)] p-4 text-white">
            <p className="text-sm text-white/70">即時預覽</p>
            {isWordPress ? (
              <div className="mt-4 rounded-[1.6rem] bg-white px-5 py-5 text-[var(--foreground)]">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">WordPress Draft</p>
                <h3 className="mt-3 text-2xl font-semibold">{wordpressPreviewTitle}</h3>
                {excerpt ? <p className="mt-3 text-sm text-[var(--muted)]">{excerpt}</p> : null}
                <div className="mt-4 space-y-3 text-sm leading-7">
                  {wordpressPreviewBody
                    .split("\n")
                    .filter(Boolean)
                    .slice(0, 5)
                    .map((line, index) => (
                      <p key={`${line}-${index}`}>{line}</p>
                    ))}
                  {!wordpressPreviewBody ? <p className="text-[var(--muted)]">這裡會顯示你的長文草稿預覽。</p> : null}
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-[1.6rem] border border-white/10 bg-black/20 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-white/55">Threads Preview</p>
                <p className="mt-3 whitespace-pre-wrap text-base leading-7">{threadPreview || "這裡會顯示你的 Threads 貼文預覽。"}</p>
                <p className="mt-4 text-xs text-white/55">字數 {text.length} / 500</p>
              </div>
            )}
          </div>

          <div className="rounded-3xl bg-[var(--card-dark)] p-4 text-white">
            <p className="text-sm text-white/70">發文選項</p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-white/60">帳號</p>
                <p className="mt-2 font-medium">{selectedAccount ? `${selectedAccount.platform} ${selectedAccount.username}` : "尚未選擇"}</p>
              </div>
            <div className="rounded-2xl border border-white/10 p-3">
              類型：{isWordPress ? "文章 / 摘要 / 分類 / 標籤 / 特色圖" : "文字 / 單一媒體 / 排程回覆"}
            </div>
            <div className="rounded-2xl border border-white/10 p-3">
              {isWordPress ? "WordPress 只同步成草稿，會自動處理分類、標籤、特色圖與聯盟連結插槽。" : "Hashtag：Threads 上限 1 個"}
            </div>
            <div className="rounded-2xl border border-white/10 p-3">
              {isWordPress ? "可快速套用觀點文、案例拆解、工具推薦、週報模板。" : "關鍵字命中可直接生成自動回覆佇列"}
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
      </div>
    </section>
  );
}
