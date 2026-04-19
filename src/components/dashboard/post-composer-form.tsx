"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HelpSheet } from "@/components/dashboard/help-sheet";
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
  const [submitTrace, setSubmitTrace] = useState<string | null>(null);
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
  const submitDisabled = isPending;
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
  const aiCanGenerate = Boolean(accountId && (aiSourceType === "url" ? aiSourceUrl.trim() : aiRawText.trim()));
  const latestDraft = recentItems[0] ?? null;
  const latestPublishLog = publishLogs[0] ?? null;

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

  function handleComposeSubmit() {
    setSubmitTrace(`clicked · ${new Date().toLocaleTimeString("zh-TW", { hour12: false })}`);
    startTransition(async () => {
      setMessage(null);
      setMessageTone("neutral");
      setLastAction(null);
      setSubmitTrace("validating");

      if (!accountId) {
        setMessage("請先選一個可用帳號。");
        setMessageTone("error");
        setSubmitTrace("blocked: missing account");
        return;
      }

      if (!text.trim()) {
        setMessage("請先填寫貼文內容。");
        setMessageTone("error");
        setSubmitTrace("blocked: empty text");
        return;
      }

      if (!isWordPress && !hasThreadsAccount) {
        setMessage("目前沒有可用的 Threads 帳號，先到 Accounts 完成授權。");
        setMessageTone("error");
        setSubmitTrace("blocked: no threads account");
        return;
      }

      if (!isWordPress && publishMode === "scheduled" && !scheduledAt) {
        setMessage("排程模式需要先填好發佈時間。");
        setMessageTone("error");
        setSubmitTrace("blocked: missing schedule time");
        return;
      }

      if (hasInvalidScheduledAt || (publishMode === "scheduled" && parsedScheduledAt && Number.isNaN(parsedScheduledAt.getTime()))) {
        setMessage("目前排程時間格式無效，請重新選一次時間。");
        setMessageTone("error");
        setSubmitTrace("blocked: invalid schedule time");
        return;
      }

      const endpoint = initialDraft ? `/api/posts/${initialDraft.id}` : "/api/threads/publish";
      setSubmitTrace(`sending -> ${endpoint}`);
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
        setSubmitTrace(`failed (${response.status})`);
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
      setSubmitTrace(`done (${response.status})`);

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

      <div className="mt-6 space-y-4">
        <form
          className="relative z-20 space-y-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            handleComposeSubmit();
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
          <div className="flex flex-wrap gap-3">
            <HelpSheet topic="compose" buttonLabel="打開這頁說明" />
            <HelpSheet topic="ai-workflow" buttonLabel="查看 AI 工作流" />
            <a href="/help?topic=compose" className="rounded-full border border-[var(--border)] bg-white/80 px-4 py-2 text-sm">
              前往說明中心
            </a>
          </div>
          <div className="rounded-3xl border border-[var(--border-strong)] bg-[rgba(200,79,44,0.06)] p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">AI Draft Assist</p>
                <h3 className="mt-2 text-xl font-semibold">直接把素材灌進目前這份稿</h3>
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
            <details className="rounded-3xl border border-[var(--border-strong)] bg-[rgba(200,79,44,0.08)] p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">Persona Assist</p>
                  <p className="mt-2 text-base font-semibold">
                    {selectedAccount.username}
                    {selectedAccount.personaLabel ? ` · ${selectedAccount.personaLabel}` : ""}
                  </p>
                </div>
                <span className="text-xs text-[var(--muted)]">展開建議</span>
              </summary>
              <div className="mt-4">
                <div className="min-w-0">
                  <p className="text-sm text-[var(--muted)]">預設語氣：{selectedAccount.defaultTone || "沿用全域設定"}</p>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                    {selectedAccount.personaPrompt || "這個帳號還沒有獨立 persona prompt，建議去 Accounts 補上。"}
                  </p>
                  {selectedAccount.topicFocus ? <p className="mt-3 text-sm leading-7 text-[var(--muted)]">題材範圍：{selectedAccount.topicFocus}</p> : null}
                  {selectedAccount.hookStyle ? <p className="mt-2 text-sm leading-7 text-[var(--muted)]">Hook 風格：{selectedAccount.hookStyle}</p> : null}
                  {selectedAccount.ctaStyle ? <p className="mt-2 text-sm leading-7 text-[var(--muted)]">CTA 風格：{selectedAccount.ctaStyle}</p> : null}
                  {selectedAccount.voiceGuardrails ? <p className="mt-2 text-sm leading-7 text-[var(--muted)]">語氣禁區：{selectedAccount.voiceGuardrails}</p> : null}
                  {selectedMemory ? (
                    <>
                      <p className="mt-3 text-sm font-medium text-[var(--foreground)]">近期內容記憶</p>
                      <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{selectedMemory.patternNote}</p>
                      <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{selectedMemory.recommendedMove}</p>
                    </>
                  ) : null}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
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
              </div>
            </details>
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

          <div className="sticky bottom-4 z-30 rounded-[1.6rem] border border-[var(--border-strong)] bg-[var(--card-strong)]/95 p-3 shadow-[0_18px_50px_rgba(40,23,10,0.18)] backdrop-blur">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-[var(--muted)]">
                {isWordPress
                  ? "先存成可編輯的 WordPress 草稿"
                  : publishMode === "scheduled"
                    ? "確認排程後直接加入佇列"
                    : "確認內容後直接送出 Threads"}
              </div>
              <button
                type="button"
                disabled={submitDisabled}
                aria-disabled={disableReason !== null}
                title={disableReason ?? undefined}
                className="pointer-events-auto min-w-[180px] cursor-pointer rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm text-white shadow-[0_16px_40px_rgba(187,90,54,0.24)] disabled:opacity-60"
                onClick={handleComposeSubmit}
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
            </div>
          </div>

          {disableReason ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {disableReason}
            </div>
          ) : null}

          {submitTrace ? (
            <p className="text-xs text-[var(--muted)]">submit trace: {submitTrace}</p>
          ) : null}
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
        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-3xl border border-[var(--border)] bg-white/82 p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">發文狀態</p>
            <p className="mt-3 text-sm leading-7 text-[var(--foreground)]">
              {isWordPress ? "WordPress 只建立草稿，不會直接公開。" : publishMode === "scheduled" ? "這篇會加入排程佇列。" : "這篇會直接送往 Threads 發佈。"}
            </p>
          </article>
          <article className="rounded-3xl border border-[var(--border)] bg-white/82 p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">最近草稿</p>
            {latestDraft ? (
              <>
                <p className="mt-3 text-sm font-medium">{latestDraft.text}</p>
                <a href={`/compose?postId=${latestDraft.id}`} className="mt-3 inline-flex text-sm font-medium text-[var(--accent)]">
                  繼續編輯
                </a>
              </>
            ) : (
              <p className="mt-3 text-sm text-[var(--muted)]">目前還沒有草稿。</p>
            )}
          </article>
          <article className="rounded-3xl border border-[var(--border)] bg-white/82 p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">最近發布結果</p>
            {latestPublishLog ? (
              <>
                <p className="mt-3 text-sm font-medium">{latestPublishLog.detail}</p>
                <a href={latestPublishLog.postHref} className="mt-3 inline-flex text-sm font-medium text-[var(--accent)]">
                  打開紀錄
                </a>
              </>
            ) : (
              <p className="mt-3 text-sm text-[var(--muted)]">最近還沒有發布紀錄。</p>
            )}
          </article>
        </section>
      </div>
    </section>
  );
}
