"use client";

import { useState, useTransition } from "react";

const wordpressTemplates = [
  { value: "opinion", label: "觀點文" },
  { value: "case-study", label: "案例拆解" },
  { value: "tool-review", label: "工具推薦" },
  { value: "weekly-recap", label: "週報 Recap" }
] as const;

type DraftSummary = {
  id: string;
  platform: string;
  title: string;
  status: string;
  href: string;
};

type IngestionSummary = {
  id: string;
  sourceType: string;
  title: string;
  createdAt: string;
  generatedCount: number;
};

type ThreadsAccountOption = {
  id: string;
  username: string;
  personaLabel: string;
  personaPrompt: string;
  defaultTone: string;
  topicFocus: string;
  hookStyle: string;
  ctaStyle: string;
  voiceGuardrails: string;
};

export function ContentEngineForm({
  initialPersonaPrompt,
  initialTone,
  initialAiProvider,
  threadsAccounts,
  recentIngestions,
  recentDrafts
}: {
  initialPersonaPrompt: string;
  initialTone: string;
  initialAiProvider: "auto" | "gemini" | "claude" | "openai";
  threadsAccounts: ThreadsAccountOption[];
  recentIngestions: IngestionSummary[];
  recentDrafts: DraftSummary[];
}) {
  const [preview, setPreview] = useState<{
    title: string;
    excerpt: string;
    text: string;
    sourceLabel: string;
    resolvedUrl: string;
  } | null>(null);
  const [sourceType, setSourceType] = useState<"url" | "text" | "image">("text");
  const [wordpressTemplate, setWordpressTemplate] = useState<(typeof wordpressTemplates)[number]["value"]>("opinion");
  const [title, setTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [rawText, setRawText] = useState("");
  const [imageUrls, setImageUrls] = useState("");
  const [threadsAccountId, setThreadsAccountId] = useState(threadsAccounts[0]?.id ?? "");
  const [personaPrompt, setPersonaPrompt] = useState(threadsAccounts[0]?.personaPrompt || initialPersonaPrompt);
  const [tone, setTone] = useState(threadsAccounts[0]?.defaultTone || initialTone);
  const [aiProvider, setAiProvider] = useState<"auto" | "gemini" | "claude" | "openai">(initialAiProvider);
  const [message, setMessage] = useState<string | null>(null);
  const [ingestions, setIngestions] = useState(recentIngestions);
  const [drafts, setDrafts] = useState(recentDrafts);
  const [isPending, startTransition] = useTransition();
  const [isPreviewPending, startPreviewTransition] = useTransition();
  const selectedThreadsAccount = threadsAccounts.find((account) => account.id === threadsAccountId) ?? null;

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Content Engine</p>
          <h2 className="mt-2 text-3xl font-semibold">輸入素材，直接拆出 Threads + WordPress 草稿</h2>
        </div>

        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              setMessage(null);

              await fetch("/api/automation/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  globalPersonaPrompt: personaPrompt,
                  defaultTone: tone,
                  aiProvider
                })
              });

              const response = await fetch("/api/ingest", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  sourceType,
                  sourceUrl: sourceType === "url" ? sourceUrl : undefined,
                  title,
                  rawText,
                  threadsAccountId: threadsAccountId || undefined,
                  wordpressTemplate,
                  imageUrls: imageUrls
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean)
                })
              });

              const result = await response.json();

              if (!response.ok) {
                setMessage(result.message ?? "內容拆解失敗");
                return;
              }

              setMessage(result.message ?? "草稿已生成，右側可以直接點進去繼續修。");
              setPreview(null);
              setIngestions((current) => [
                {
                  id: result.ingestionId,
                  sourceType,
                  title: title || "未命名素材",
                  createdAt: "剛剛",
                  generatedCount: result.generatedPostIds?.length ?? 0
                },
                ...current
              ]);
              setDrafts((current) => [
                ...current,
                ...((result.generatedDrafts ?? []) as Array<{ id: string; platform: string; title: string; status: string }>).map(
                  (draft) => ({
                    ...draft,
                    href: `/compose?postId=${draft.id}`
                  })
                )
              ]);
            });
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="rounded-3xl bg-white/85 p-4">
              <span className="mb-2 block text-sm text-[var(--muted)]">目標 Threads 帳號</span>
              <select
                className="w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3 outline-none"
                value={threadsAccountId}
                onChange={(event) => {
                  const nextAccountId = event.target.value;
                  const nextAccount = threadsAccounts.find((account) => account.id === nextAccountId) ?? null;
                  setThreadsAccountId(nextAccountId);
                  setPersonaPrompt(nextAccount?.personaPrompt || initialPersonaPrompt);
                  setTone(nextAccount?.defaultTone || initialTone);
                }}
              >
                {threadsAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.username}{account.personaLabel ? ` · ${account.personaLabel}` : ""}
                  </option>
                ))}
              </select>
              <p className="mt-3 text-sm text-[var(--muted)]">
                {selectedThreadsAccount
                  ? `目前會用 ${selectedThreadsAccount.username}${selectedThreadsAccount.personaLabel ? ` 的「${selectedThreadsAccount.personaLabel}」` : ""} 來生成 Threads 草稿。`
                  : "尚未選擇 Threads 帳號。"}
              </p>
            </label>
            <label className="rounded-3xl bg-white/85 p-4">
              <span className="mb-2 block text-sm text-[var(--muted)]">來源類型</span>
              <select
                className="w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3 outline-none"
                value={sourceType}
                onChange={(event) => setSourceType(event.target.value as "url" | "text" | "image")}
              >
                <option value="text">純文本</option>
                <option value="url">網址</option>
                <option value="image">圖片 / 截圖</option>
              </select>
            </label>
            <label className="rounded-3xl bg-white/85 p-4">
              <span className="mb-2 block text-sm text-[var(--muted)]">標題</span>
              <input
                className="w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3 outline-none"
                placeholder="素材標題"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
          </div>

          {selectedThreadsAccount ? (
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--accent-soft)]/80 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Persona Playbook</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {selectedThreadsAccount.topicFocus ? (
                  <p className="text-sm text-[var(--foreground)]">
                    <span className="font-medium">題材範圍：</span>
                    {selectedThreadsAccount.topicFocus}
                  </p>
                ) : null}
                {selectedThreadsAccount.hookStyle ? (
                  <p className="text-sm text-[var(--foreground)]">
                    <span className="font-medium">Hook 風格：</span>
                    {selectedThreadsAccount.hookStyle}
                  </p>
                ) : null}
                {selectedThreadsAccount.ctaStyle ? (
                  <p className="text-sm text-[var(--foreground)]">
                    <span className="font-medium">CTA 風格：</span>
                    {selectedThreadsAccount.ctaStyle}
                  </p>
                ) : null}
                {selectedThreadsAccount.voiceGuardrails ? (
                  <p className="text-sm text-[var(--foreground)]">
                    <span className="font-medium">語氣禁區：</span>
                    {selectedThreadsAccount.voiceGuardrails}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {sourceType === "url" ? (
            <div className="rounded-3xl bg-white/85 p-4">
              <label className="mb-2 block text-sm text-[var(--muted)]">來源網址</label>
              <input
                className="w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3 outline-none"
                placeholder="https://www.threads.net/... 或文章網址"
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
                required
              />
              <p className="mt-3 text-sm text-[var(--muted)]">
                支援貼入公開 Threads 貼文、部落格文章或公開 Facebook Page 內容連結。若平台限制抓取，系統會退回連結改寫模式。
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={!sourceUrl || isPending || isPreviewPending}
                  className="rounded-full border border-[var(--border-strong)] px-4 py-2 text-sm text-[var(--foreground)] disabled:opacity-60"
                  onClick={() => {
                    startPreviewTransition(async () => {
                      setMessage(null);
                      const response = await fetch("/api/ingest/preview", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ sourceUrl })
                      });
                      const result = await response.json();

                      if (!response.ok) {
                        setPreview(null);
                        setMessage(result.message ?? "網址預覽失敗");
                        return;
                      }

                      setPreview(result.preview);
                      if (!title) {
                        setTitle(result.preview.title ?? "");
                      }
                    });
                  }}
                >
                  {isPreviewPending ? "抓取中..." : "先看抓取預覽"}
                </button>
                {preview ? (
                  <button
                    type="button"
                    className="rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted)]"
                    onClick={() => setPreview(null)}
                  >
                    清除預覽
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="rounded-3xl bg-white/85 p-4">
            <label className="mb-2 block text-sm text-[var(--muted)]">原始素材</label>
            <textarea
              className="min-h-52 w-full resize-none rounded-2xl border border-[var(--border)] bg-transparent p-4 outline-none"
              placeholder="貼上文章摘要、調研內容、訪談逐字稿或你想重寫的內容"
              value={rawText}
              onChange={(event) => setRawText(event.target.value)}
              required={sourceType !== "url"}
            />
          </div>

          <div className="rounded-3xl bg-white/85 p-4">
            <label className="mb-2 block text-sm text-[var(--muted)]">圖片 URL（可多張，用逗號分隔）</label>
            <input
              className="w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3 outline-none"
              placeholder="https://image-1,..."
              value={imageUrls}
              onChange={(event) => setImageUrls(event.target.value)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl bg-white/85 p-4">
              <label className="mb-2 block text-sm text-[var(--muted)]">Persona Prompt</label>
              <textarea
                className="min-h-36 w-full resize-none rounded-2xl border border-[var(--border)] bg-transparent p-4 outline-none"
                value={personaPrompt}
                onChange={(event) => setPersonaPrompt(event.target.value)}
              />
              <p className="mt-3 text-sm text-[var(--muted)]">
                這裡會先帶入帳號人設；生成時也會一起吃進題材範圍、hook / CTA 風格和語氣禁區。
              </p>
            </div>
            <label className="rounded-3xl bg-white/85 p-4">
              <span className="mb-2 block text-sm text-[var(--muted)]">預設語氣</span>
              <select
                className="w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3 outline-none"
                value={tone}
                onChange={(event) => setTone(event.target.value)}
              >
                <option value="sharp-observer">Sharp Observer</option>
                <option value="mystic-guide">Mystic Guide</option>
                  <option value="founder-journal">Founder Journal</option>
                </select>
              </label>
            <label className="rounded-3xl bg-white/85 p-4">
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
          </div>
          <div className="rounded-3xl bg-white/85 p-4">
            <label className="mb-2 block text-sm text-[var(--muted)]">WordPress 草稿版型</label>
            <div className="grid gap-3 md:grid-cols-4">
              {wordpressTemplates.map((template) => (
                <button
                  key={template.value}
                  type="button"
                  className={`rounded-2xl border px-4 py-3 text-sm ${
                    wordpressTemplate === template.value
                      ? "border-[var(--border-strong)] bg-[var(--accent-soft)] text-[var(--foreground)]"
                      : "border-[var(--border)] bg-white text-[var(--muted)]"
                  }`}
                  onClick={() => setWordpressTemplate(template.value)}
                >
                  {template.label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-sm text-[var(--muted)]">生成的 WordPress draft 會依照這個版型保留結構與聯盟連結插槽。</p>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm text-white"
          >
            {isPending ? "生成中..." : "生成多平台草稿"}
          </button>
          {message ? <p className="text-sm text-[var(--muted)]">{message}</p> : null}
          {message?.includes("fallback") || message?.includes("AI") ? (
            <p className="text-sm text-[var(--danger)]">
              目前這次生成不一定真的有用到 AI。若你有串 API，先看訊息裡的 provider / 錯誤原因。
            </p>
          ) : null}
        </form>
      </section>

      <div className="space-y-6">
        <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
          {preview ? (
            <article className="mb-4 rounded-[1.4rem] border border-[var(--border-strong)] bg-[var(--accent-soft)] p-4 text-[var(--foreground)]">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                Import Preview · {preview.sourceLabel}
              </p>
              <h3 className="mt-2 text-xl font-semibold">{preview.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--foreground)]/80">{preview.excerpt}</p>
              <div className="mt-4 rounded-[1.2rem] bg-white/75 p-4 text-sm leading-7 text-[var(--foreground)]">
                {preview.text
                  .split("\n")
                  .filter(Boolean)
                  .slice(0, 4)
                  .map((line, index) => (
                    <p key={`${line}-${index}`}>{line}</p>
                  ))}
              </div>
              <a
                href={preview.resolvedUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex text-sm font-medium text-[var(--accent)]"
              >
                打開原始內容
              </a>
            </article>
          ) : null}
          <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Recent Ingestions</p>
          <h2 className="mt-2 text-2xl font-semibold">最近輸入</h2>
          <div className="mt-4 space-y-3">
            {ingestions.map((item) => (
              <article key={item.id} className="rounded-[1.4rem] border border-[var(--border)] bg-white/70 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  {item.sourceType} · {item.createdAt}
                </p>
                <p className="mt-2 font-medium">{item.title}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">已建立 {item.generatedCount} 筆草稿</p>
              </article>
            ))}
            {ingestions.length === 0 ? <p className="text-sm text-[var(--muted)]">目前還沒有輸入紀錄。</p> : null}
          </div>
        </section>

        <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
          <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Draft Queue</p>
          <h2 className="mt-2 text-2xl font-semibold">最新草稿</h2>
          <div className="mt-4 space-y-3">
            {drafts.map((draft) => (
              <article key={draft.id} className="rounded-[1.4rem] border border-[var(--border)] bg-white/70 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  {draft.platform} · {draft.status}
                </p>
                <p className="mt-2 font-medium">{draft.title}</p>
                <a href={draft.href} className="mt-3 inline-flex text-sm font-medium text-[var(--accent)]">
                  打開草稿
                </a>
              </article>
            ))}
            {drafts.length === 0 ? <p className="text-sm text-[var(--muted)]">目前還沒有草稿。</p> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
