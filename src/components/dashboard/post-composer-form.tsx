"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
  personaLabel?: string;
  personaPrompt?: string;
  defaultTone?: string;
  topicFocus?: string;
  hookStyle?: string;
  ctaStyle?: string;
  voiceGuardrails?: string;
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

type PersonaMemory = {
  accountId: string;
  topOpeners: string[];
  topClosers: string[];
  patternNote: string;
  recommendedMove: string;
};

type PublishOutcomeLog = {
  id: string;
  actionType: string;
  status: string;
  detail: string;
  executedAt: string;
  accountLabel: string;
  postHref: string;
};

function buildHookSuggestions(account: AccountOption | undefined) {
  const label = account?.personaLabel || account?.defaultTone || "default";

  if (label.includes("mystic") || label.includes("guide")) {
    return ["先說一個反常識結論：", "最近我一直在想一件事：", "如果你卡在這裡，先看這一句："];
  }

  if (label.includes("founder") || label.includes("創業")) {
    return ["如果我是創業者，我會先看這個：", "這件事我最近在實際經營裡反覆驗證：", "先講結論，這個決策比想像中更重要："];
  }

  return ["我看到一個很值得拆的點：", "先說結論，這件事不要再直覺做了：", "如果你只記一件事，先記這個："];
}

function buildCtaSuggestions(account: AccountOption | undefined) {
  const label = account?.personaLabel || account?.defaultTone || "default";

  if (label.includes("mystic") || label.includes("guide")) {
    return ["如果你也在想同一題，留言告訴我。", "想看我繼續拆這個方向，我再往下寫。", "如果這段有戳到你，留一句你的觀察。"];
  }

  if (label.includes("founder") || label.includes("創業")) {
    return ["如果你也在做這題，我想知道你會怎麼判斷。", "想看我把這件事拆成實際操作，再跟我說。", "如果你也踩過這個坑，留言補你的版本。"];
  }

  return ["如果你也有同感，留言讓我知道。", "想看我把這題延伸成長文，我再寫下一篇。", "如果這篇對你有用，轉給也在做這題的人。"];
}

export function PostComposerForm({
  accounts,
  recentPosts,
  affiliateLibrary,
  initialDraft,
  initialSeed,
  reviewContext,
  preferredAccountId,
  personaMemories,
  publishLogs,
  initialAiProvider
}: {
  accounts: AccountOption[];
  recentPosts: RecentPost[];
  affiliateLibrary: AffiliateLibrary;
  initialDraft?: DraftPost | null;
  initialSeed?: DraftPost | null;
  reviewContext?: ReviewContext | null;
  preferredAccountId?: string;
  personaMemories: Record<string, PersonaMemory>;
  publishLogs: PublishOutcomeLog[];
  initialAiProvider: "auto" | "gemini" | "claude" | "openai";
}) {
  const router = useRouter();
  const baseDraft = initialDraft ?? initialSeed ?? null;
  const [recentItems, setRecentItems] = useState(recentPosts);
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
  const [messageTone, setMessageTone] = useState<"neutral" | "success" | "error">("neutral");
  const [lastAction, setLastAction] = useState<null | { href: string; label: string }>(null);
  const [isPending, startTransition] = useTransition();
  const [isAiPending, startAiTransition] = useTransition();
  const [aiSourceType, setAiSourceType] = useState<"text" | "url">("text");
  const [aiTitle, setAiTitle] = useState("");
  const [aiRawText, setAiRawText] = useState("");
  const [aiSourceUrl, setAiSourceUrl] = useState("");
  const [aiProvider, setAiProvider] = useState<"auto" | "gemini" | "claude" | "openai">(initialAiProvider);
  const [aiWordpressTemplate, setAiWordpressTemplate] = useState<(typeof wordpressTemplates)[number]["id"]>("opinion");
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [aiMessageTone, setAiMessageTone] = useState<"neutral" | "success" | "error">("neutral");

  const selectedAccount = accounts.find((account) => account.id === accountId);
  const selectedMemory = selectedAccount ? personaMemories[selectedAccount.id] : undefined;
  const isWordPress = selectedAccount?.platform === "wordpress";
  const hasThreadsAccount = accounts.some((account) => account.platform === "threads");
  const normalizedScheduledAt = scheduledAt.trim();
  const parsedScheduledAt = normalizedScheduledAt ? new Date(normalizedScheduledAt) : null;
  const hasInvalidScheduledAt = Boolean(
    !isWordPress &&
      publishMode === "scheduled" &&
      normalizedScheduledAt &&
      (!parsedScheduledAt || Number.isNaN(parsedScheduledAt.getTime()))
  );
  const hookSuggestions = buildHookSuggestions(selectedAccount);
  const ctaSuggestions = buildCtaSuggestions(selectedAccount);
  const disableReason =
    isPending ? "正在送出中，請稍等。" :
    !accountId ? "請先選一個發布帳號。" :
    !text.trim() ? "請先填寫貼文內容。" :
    (!isWordPress && !hasThreadsAccount) ? "目前沒有可用的 Threads 帳號。" :
    (!isWordPress && publishMode === "scheduled" && !normalizedScheduledAt) ? "排程模式需要先填好排程時間。" :
    hasInvalidScheduledAt ? "目前排程時間格式無效，請重新選一次時間。" :
    null;
  const submitDisabled =
    disableReason !== null;
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
  const aiCanGenerate = Boolean(accountId && (aiSourceType === "url" ? aiSourceUrl.trim() : aiRawText.trim()));

  async function removeDraft(postId: string, options?: { redirectAfterDelete?: boolean }) {
    const response = await fetch(`/api/posts/${postId}`, {
      method: "DELETE"
    });
    const result = await response.json();

    if (!response.ok) {
      setMessage(result.message ?? "刪除草稿失敗");
      setMessageTone("error");
      return;
    }

    setMessage(result.message ?? "草稿已刪除。");
    setMessageTone("success");
    setLastAction(null);
    setRecentItems((current) => current.filter((item) => item.id !== postId));

    if (options?.redirectAfterDelete) {
      router.push("/compose");
      router.refresh();
      return;
    }

    router.refresh();
  }

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
          noValidate
          onSubmit={(event) => {
            event.preventDefault();

            startTransition(async () => {
              setMessage(null);
              setMessageTone("neutral");
              setLastAction(null);

              if (!accountId) {
                setMessage("請先選一個可用帳號。");
                setMessageTone("error");
                return;
              }

              if (!text.trim()) {
                setMessage("請先填寫貼文內容。");
                setMessageTone("error");
                return;
              }

              if (!isWordPress && !hasThreadsAccount) {
                setMessage("目前沒有可用的 Threads 帳號，先到 Accounts 完成授權。");
                setMessageTone("error");
                return;
              }

              if (!isWordPress && publishMode === "scheduled" && !scheduledAt) {
                setMessage("排程模式需要先填好發佈時間。");
                setMessageTone("error");
                return;
              }

              if (hasInvalidScheduledAt || (publishMode === "scheduled" && parsedScheduledAt && Number.isNaN(parsedScheduledAt.getTime()))) {
                setMessage("目前排程時間格式無效，請重新選一次時間。");
                setMessageTone("error");
                return;
              }

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
                  scheduledAt: publishMode === "scheduled" && parsedScheduledAt ? parsedScheduledAt.toISOString() : undefined
                })
              });

              const result = await response.json();

              if (!response.ok) {
                setMessage(result.message ?? "發文失敗，請稍後再試");
                setMessageTone("error");
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
              setMessageTone("success");

              if (result.postId) {
                setLastAction({
                  href: isWordPress ? `/compose?postId=${result.postId}` : publishMode === "scheduled" ? "/desk?tab=queue" : `/posts/${result.postId}`,
                  label: isWordPress ? "打開這篇草稿" : publishMode === "scheduled" ? "去 Queue 看排程" : "看這篇 Threads 指標"
                });
              }

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
                if (isWordPress && result.postId) {
                  router.refresh();
                }
              }
            });
          }}
        >
          {initialDraft ? (
            <div className="rounded-3xl border border-[var(--border-strong)] bg-[var(--accent-soft)] p-4 text-sm text-[var(--foreground)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  正在編輯：
                  <span className="ml-2 font-semibold">{initialDraft.platform === "wordpress" ? "WordPress 草稿" : "Threads 草稿"}</span>
                </div>
                <button
                  type="button"
                  className="rounded-full border border-rose-200 bg-white px-4 py-2 text-sm text-rose-700"
                  onClick={() => {
                    startTransition(async () => {
                      await removeDraft(initialDraft.id, { redirectAfterDelete: true });
                    });
                  }}
                >
                  刪除這篇草稿
                </button>
              </div>
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
                    {account.personaLabel ? ` · ${account.personaLabel}` : ""}
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
          <div className="rounded-3xl border border-[var(--border-strong)] bg-[rgba(200,79,44,0.06)] p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">AI Draft Assist</p>
                <h3 className="mt-2 text-xl font-semibold">先在這裡起稿，再直接往下修和發布</h3>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                  不用再切去另一頁。AI 會直接依照目前帳號的人設、語氣和 playbook，把素材灌進現在這份發文表單。
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-white/78 px-4 py-3 text-sm text-[var(--muted)]">
                目前會套用：
                <span className="ml-2 font-medium text-[var(--foreground)]">
                  {selectedAccount ? `${selectedAccount.username}${selectedAccount.personaLabel ? ` · ${selectedAccount.personaLabel}` : ""}` : "尚未選帳號"}
                </span>
              </div>
            </div>
            <div className="mt-4 grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <label className="rounded-3xl bg-white/88 p-4 md:col-span-1">
                    <span className="mb-2 block text-sm text-[var(--muted)]">素材形式</span>
                    <select
                      className="w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3 outline-none"
                      value={aiSourceType}
                      onChange={(event) => setAiSourceType(event.target.value as "text" | "url")}
                    >
                      <option value="text">貼文字素材</option>
                      <option value="url">貼網址</option>
                    </select>
                  </label>
                  <label className="rounded-3xl bg-white/88 p-4 md:col-span-1">
                    <span className="mb-2 block text-sm text-[var(--muted)]">AI Provider</span>
                    <select
                      className="w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3 outline-none"
                      value={aiProvider}
                      onChange={(event) => setAiProvider(event.target.value as "auto" | "gemini" | "claude" | "openai")}
                    >
                      <option value="auto">Auto</option>
                      <option value="gemini">Gemini</option>
                      <option value="claude">Claude</option>
                      <option value="openai">OpenAI</option>
                    </select>
                  </label>
                  {isWordPress ? (
                    <label className="rounded-3xl bg-white/88 p-4 md:col-span-1">
                      <span className="mb-2 block text-sm text-[var(--muted)]">長文版型</span>
                      <select
                        className="w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3 outline-none"
                        value={aiWordpressTemplate}
                        onChange={(event) => setAiWordpressTemplate(event.target.value as (typeof wordpressTemplates)[number]["id"])}
                      >
                        {wordpressTemplates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </div>
                <label className="rounded-3xl bg-white/88 p-4">
                  <span className="mb-2 block text-sm text-[var(--muted)]">這次素材主題</span>
                  <input
                    className="w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3 outline-none"
                    placeholder={isWordPress ? "例如：把這則 Threads 延伸成教學文" : "例如：把這段觀察改寫成 Threads 首發"}
                    value={aiTitle}
                    onChange={(event) => setAiTitle(event.target.value)}
                  />
                </label>
                {aiSourceType === "url" ? (
                  <label className="rounded-3xl bg-white/88 p-4">
                    <span className="mb-2 block text-sm text-[var(--muted)]">公開連結</span>
                    <input
                      className="w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3 outline-none"
                      placeholder="https://www.threads.net/... 或文章網址"
                      value={aiSourceUrl}
                      onChange={(event) => setAiSourceUrl(event.target.value)}
                    />
                  </label>
                ) : (
                  <label className="rounded-3xl bg-white/88 p-4">
                    <span className="mb-2 block text-sm text-[var(--muted)]">原始素材</span>
                    <textarea
                      className="min-h-32 w-full resize-none rounded-2xl border border-[var(--border)] bg-transparent p-4 outline-none"
                      placeholder="貼你要改寫的段落、筆記、想法或外部素材摘要"
                      value={aiRawText}
                      onChange={(event) => setAiRawText(event.target.value)}
                    />
                  </label>
                )}
              </div>
              <div className="rounded-[1.6rem] border border-[var(--border)] bg-[var(--card-dark)] p-5 text-white">
                <p className="text-xs uppercase tracking-[0.2em] text-white/55">AI 起稿後會直接覆蓋當前編輯欄位</p>
                <div className="mt-4 space-y-3 text-sm leading-7 text-white/80">
                  <p>{isWordPress ? "會直接填入標題、摘要、HTML 長文草稿。" : "會直接把 Threads 草稿灌進貼文內容。"} 不會先另外落一份草稿。</p>
                  <p>如果你只是想先測一個角度，直接按一次 AI 起稿，再在下方微調後立即發或排程就好。</p>
                  {selectedAccount?.topicFocus ? <p>題材範圍：{selectedAccount.topicFocus}</p> : null}
                  {selectedAccount?.voiceGuardrails ? <p>語氣禁區：{selectedAccount.voiceGuardrails}</p> : null}
                </div>
                <button
                  type="button"
                  disabled={!aiCanGenerate || isAiPending}
                  className="mt-5 w-full rounded-2xl bg-white px-4 py-3 text-sm font-medium text-[var(--card-dark)] disabled:opacity-60"
                  onClick={() => {
                    startAiTransition(async () => {
                      setAiMessage(null);
                      setAiMessageTone("neutral");

                      const response = await fetch("/api/compose/ai-draft", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                          accountId,
                          sourceType: aiSourceType,
                          sourceUrl: aiSourceType === "url" ? aiSourceUrl : undefined,
                          title: aiTitle,
                          rawText: aiSourceType === "text" ? aiRawText : undefined,
                          provider: aiProvider,
                          wordpressTemplate: isWordPress ? aiWordpressTemplate : undefined
                        })
                      });

                      const result = await response.json();

                      if (!response.ok) {
                        setAiMessage(result.message ?? "AI 起稿失敗");
                        setAiMessageTone("error");
                        return;
                      }

                      if (isWordPress) {
                        setTitle(result.draft.wordpressTitle ?? "");
                        setText(result.draft.summary ?? "");
                        setExcerpt(result.draft.wordpressExcerpt ?? "");
                        setHtml(result.draft.wordpressHtml ?? "");
                      } else {
                        setText(result.draft.threadsDraft ?? "");
                      }

                      setAiMessage(
                        `${result.provider.toUpperCase()} 已套用 ${result.sourceLabel ? `(${result.sourceLabel})` : ""} 的 AI 草稿。`
                      );
                      setAiMessageTone("success");
                    });
                  }}
                >
                  {isAiPending ? "AI 起稿中..." : isWordPress ? "AI 幫我起 WordPress 草稿" : "AI 幫我起 Threads 草稿"}
                </button>
                {aiMessage ? (
                  <div
                    className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
                      aiMessageTone === "error"
                        ? "border border-rose-300/40 bg-rose-400/10 text-rose-100"
                        : aiMessageTone === "success"
                          ? "border border-emerald-300/40 bg-emerald-400/10 text-emerald-100"
                          : "border border-white/15 bg-white/5 text-white/75"
                    }`}
                  >
                    {aiMessage}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          {!hasThreadsAccount ? (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              目前沒有 Threads 帳號，現在只能建立 WordPress 草稿。若要直接發布 Threads，先到 Accounts 完成授權。
            </div>
          ) : null}
          {!isWordPress && selectedAccount ? (
            <div className="rounded-3xl border border-[var(--border-strong)] bg-[rgba(200,79,44,0.08)] p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">Persona Assist</p>
                  <h3 className="mt-2 text-xl font-semibold">
                    {selectedAccount.username}
                    {selectedAccount.personaLabel ? ` · ${selectedAccount.personaLabel}` : ""}
                  </h3>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    預設語氣：{selectedAccount.defaultTone || "沿用全域設定"}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                    {selectedAccount.personaPrompt || "這個帳號還沒有獨立 persona prompt，建議去 Accounts 補上，之後多帳號會更穩。"}
                  </p>
                  {selectedAccount.topicFocus ? (
                    <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                      題材範圍：{selectedAccount.topicFocus}
                    </p>
                  ) : null}
                  {selectedAccount.hookStyle ? (
                    <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                      Hook 風格：{selectedAccount.hookStyle}
                    </p>
                  ) : null}
                  {selectedAccount.ctaStyle ? (
                    <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                      CTA 風格：{selectedAccount.ctaStyle}
                    </p>
                  ) : null}
                  {selectedAccount.voiceGuardrails ? (
                    <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                      語氣禁區：{selectedAccount.voiceGuardrails}
                    </p>
                  ) : null}
                  {selectedMemory ? (
                    <>
                      <p className="mt-3 text-sm font-medium text-[var(--foreground)]">近期內容記憶</p>
                      <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{selectedMemory.patternNote}</p>
                      <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{selectedMemory.recommendedMove}</p>
                    </>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {hookSuggestions.map((hook) => (
                    <button
                      key={hook}
                      type="button"
                      className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm"
                      onClick={() => setText((current) => `${hook}${current ? `\n\n${current}` : ""}`)}
                    >
                      {hook}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {ctaSuggestions.map((cta) => (
                  <button
                    key={cta}
                    type="button"
                    className="rounded-[1.2rem] border border-[var(--border)] bg-white/78 px-4 py-3 text-left text-sm"
                    onClick={() => setText((current) => `${current.trim()}${current.trim() ? "\n\n" : ""}${cta}`)}
                  >
                    {cta}
                  </button>
                ))}
              </div>
              {selectedMemory?.topOpeners?.length ? (
                <div className="mt-4 rounded-[1.2rem] border border-[var(--border)] bg-white/78 p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">這個帳號最近比較吃香的開頭</p>
                  <div className="mt-3 grid gap-2">
                    {selectedMemory.topOpeners.map((opener) => (
                      <button
                        key={opener}
                        type="button"
                        className="rounded-[1rem] border border-[var(--border)] bg-white px-4 py-3 text-left text-sm"
                        onClick={() => setText((current) => `${opener}${current ? `\n\n${current}` : ""}`)}
                      >
                        {opener}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {selectedMemory?.topClosers?.length ? (
                <div className="mt-4 rounded-[1.2rem] border border-[var(--border)] bg-white/78 p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">這個帳號最近比較吃香的結尾</p>
                  <div className="mt-3 grid gap-2">
                    {selectedMemory.topClosers.map((closer) => (
                      <button
                        key={closer}
                        type="button"
                        className="rounded-[1rem] border border-[var(--border)] bg-white px-4 py-3 text-left text-sm"
                        onClick={() => setText((current) => `${current.trim()}${current.trim() ? "\n\n" : ""}${closer}`)}
                      >
                        {closer}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
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

          {disableReason ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {disableReason}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitDisabled}
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
          {message ? (
            <div
              className={`rounded-2xl px-4 py-3 text-sm ${
                messageTone === "error"
                  ? "border border-rose-200 bg-rose-50 text-rose-700"
                  : messageTone === "success"
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border border-[var(--border)] bg-white/70 text-[var(--muted)]"
              }`}
            >
              <p>{message}</p>
              {lastAction ? (
                <a href={lastAction.href} className="mt-2 inline-flex font-medium text-current underline underline-offset-4">
                  {lastAction.label}
                </a>
              ) : null}
            </div>
          ) : null}
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
            <p className="text-sm text-white/70">工作側欄</p>
            <div className="mt-4 space-y-5">
              <section>
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">Live Preview</p>
                <div className="mt-3 rounded-[1.35rem] border border-white/10 bg-white/5 p-4">
                  {isWordPress ? (
                    <div className="space-y-3">
                      <p className="text-sm font-medium">{wordpressPreviewTitle}</p>
                      {excerpt ? <p className="text-sm text-white/65">{excerpt}</p> : null}
                      <div className="space-y-2 text-sm leading-7 text-white/85">
                        {wordpressPreviewBody
                          .split("\n")
                          .filter(Boolean)
                          .slice(0, 4)
                          .map((line, index) => (
                            <p key={`${line}-${index}`}>{line}</p>
                          ))}
                        {!wordpressPreviewBody ? <p className="text-white/55">這裡會顯示你的長文草稿預覽。</p> : null}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="whitespace-pre-wrap text-sm leading-7 text-white/88">
                        {threadPreview || "這裡會顯示你的 Threads 貼文預覽。"}
                      </p>
                      <p className="text-xs text-white/50">字數 {text.length} / 500</p>
                    </div>
                  )}
                </div>
              </section>

              <section>
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">Current Setup</p>
                <div className="mt-3 overflow-hidden rounded-[1.35rem] border border-white/10">
                  {[
                    {
                      label: "帳號",
                      value: selectedAccount ? `${selectedAccount.platform} ${selectedAccount.username}` : "尚未選擇"
                    },
                    {
                      label: "類型",
                      value: isWordPress ? "文章 / 摘要 / 分類 / 標籤 / 特色圖" : "文字 / 單一媒體 / 排程"
                    },
                    {
                      label: "工作流",
                      value: isWordPress
                        ? "只同步成草稿，後續回 WordPress 後台細修"
                        : "可立即發文，或先加入排程佇列"
                    }
                  ].map((item, index) => (
                    <div
                      key={item.label}
                      className={`grid grid-cols-[84px_1fr] gap-3 bg-white/5 px-4 py-3 text-sm ${
                        index > 0 ? "border-t border-white/10" : ""
                      }`}
                    >
                      <p className="text-white/45">{item.label}</p>
                      <p className="text-white/88">{item.value}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">最近發布結果</p>
                  <span className="text-xs text-white/35">{publishLogs.length} 筆</span>
                </div>
                <div className="mt-3 overflow-hidden rounded-[1.35rem] border border-white/10">
                  {publishLogs.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-white/55">最近還沒有發布紀錄</p>
                  ) : (
                    publishLogs.map((log, index) => (
                      <a
                        key={log.id}
                        href={log.postHref}
                        className={`grid grid-cols-[112px_1fr_auto] gap-3 bg-white/5 px-4 py-3 text-sm ${
                          index > 0 ? "border-t border-white/10" : ""
                        }`}
                      >
                        <p className="text-white/45">{log.executedAt}</p>
                        <div className="min-w-0">
                          <p className="truncate text-white/85">{log.detail}</p>
                          <p className="mt-1 text-xs text-white/45">{log.accountLabel}</p>
                        </div>
                        <p
                          className={`text-xs uppercase tracking-[0.16em] ${
                            log.status === "failed" ? "text-rose-300" : log.status === "scheduled" ? "text-amber-200" : "text-emerald-300"
                          }`}
                        >
                          {log.status}
                        </p>
                      </a>
                    ))
                  )}
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">最近草稿</p>
                  <span className="text-xs text-white/35">{recentItems.length} 筆</span>
                </div>
                <div className="mt-3 overflow-hidden rounded-[1.35rem] border border-white/10">
                  {recentItems.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-white/55">目前還沒有草稿紀錄</p>
                  ) : (
                    recentItems.map((post, index) => (
                      <div
                        key={post.id}
                        className={`grid grid-cols-[1fr_auto] gap-3 bg-white/5 px-4 py-3 text-sm ${
                          index > 0 ? "border-t border-white/10" : ""
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-[0.16em] text-white/45">
                            {post.account}{post.platform ? ` · ${post.platform}` : ""} · {post.status}
                          </p>
                          <p className="mt-2 truncate text-white/88">{post.text}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <a href={`/compose?postId=${post.id}`} className="rounded-full border border-white/15 px-3 py-2 text-xs text-white/88">
                            編輯
                          </a>
                          {post.status !== "published" ? (
                            <button
                              type="button"
                              className="rounded-full border border-rose-300/30 px-3 py-2 text-xs text-rose-200"
                              onClick={() => {
                                startTransition(async () => {
                                  await removeDraft(post.id);
                                });
                              }}
                            >
                              刪除
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
