"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type ReviewPost = {
  id: string;
  title: string;
  text: string;
  excerpt: string;
  personaLabel?: string;
  accountId: string;
  accountLabel: string;
};

type ReviewAccount = {
  id: string;
  username: string;
  personaLabel?: string;
};

type ReviewWorkspaceProps = {
  post: ReviewPost;
  sourceUrl?: string | null;
  candidateRationale?: string | null;
  accounts: ReviewAccount[];
};

const CONTENT_MODES = [
  { value: "快速評論", prompt: "把這篇整理成結論先行、適合當天發出的快評 Threads。" },
  { value: "深度拆解", prompt: "把這篇整理成有脈絡、有觀點、適合逐段拆解的 Threads。" },
  { value: "教學型", prompt: "把這篇整理成讓讀者學得到東西的教學型 Threads。" },
  { value: "觀點分享", prompt: "把這篇整理成保留個人立場與觀點的 Threads。" }
] as const;

const GOALS = ["回覆數", "轉發", "收藏", "點連結", "建立權威"] as const;
const OPTIMIZE_FOR = ["開頭鉤子", "論述清晰度", "節奏", "CTA", "角度"] as const;

export function ReviewWorkspace({ post, sourceUrl, candidateRationale, accounts }: ReviewWorkspaceProps) {
  const router = useRouter();
  const [selectedAccountId, setSelectedAccountId] = useState(post.accountId || accounts[0]?.id || "");
  const [contentMode, setContentMode] = useState<(typeof CONTENT_MODES)[number]["value"]>("觀點分享");
  const [goal, setGoal] = useState<(typeof GOALS)[number]>("回覆數");
  const [optimizeFor, setOptimizeFor] = useState<(typeof OPTIMIZE_FOR)[number]>("開頭鉤子");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"neutral" | "error">("neutral");
  const [isPending, startTransition] = useTransition();

  const selectedMode = CONTENT_MODES.find((mode) => mode.value === contentMode) ?? CONTENT_MODES[3];

  async function generateDraft() {
    setMessage(null);
    setMessageTone("neutral");

    const response = await fetch("/api/compose/ai-draft", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        accountId: selectedAccountId,
        sourceType: "text",
        title: post.title,
        rawText: post.text || post.excerpt,
        brief: [selectedMode.prompt, note.trim()].filter(Boolean).join("\n"),
        goal: `這篇主要想提高：${goal}`,
        optimizeFor: `AI 請優先注意：${optimizeFor}`,
        createDraft: true,
        sourcePostId: post.id
      })
    });

    const result = await response.json();

    if (!response.ok || !result.postId) {
      setMessage(result.message ?? "AI 生成草稿失敗");
      setMessageTone("error");
      return;
    }

    router.push(`/compose?postId=${result.postId}`);
  }

  return (
    <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Review Workspace</p>
          <h2 className="mt-2 text-3xl font-semibold">先想清楚，再讓 AI 幫你出可發版</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
            這裡不是最後發布區。先看來源脈絡、決定 assignment，再讓 AI 幫你生成一版真正值得送進 Compose 的 Threads 草稿。
          </p>
        </div>
        <a href="/desk?tab=queue" className="rounded-full border border-[var(--border)] bg-white/80 px-4 py-2 text-sm">
          回 Queue
        </a>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-[1.6rem] border border-[var(--border)] bg-white/78 p-5">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">來源摘要</p>
          <h3 className="mt-3 text-2xl font-semibold">{post.title}</h3>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--foreground)]">{post.text || post.excerpt || "這篇候選稿目前沒有可顯示內容。"}</p>

          <div className="mt-5 space-y-3 text-sm">
            <div className="rounded-[1.1rem] border border-[var(--border)] bg-[rgba(255,252,248,0.9)] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">候選理由</p>
              <p className="mt-2 leading-7 text-[var(--foreground)]">{candidateRationale || "目前沒有候選理由摘要。建議先看原文後再給 assignment。"}</p>
            </div>
            <div className="rounded-[1.1rem] border border-[var(--border)] bg-[rgba(255,252,248,0.9)] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">人設建議</p>
              <p className="mt-2 leading-7 text-[var(--foreground)]">{post.personaLabel || post.accountLabel}</p>
            </div>
            {sourceUrl ? (
              <div className="rounded-[1.1rem] border border-[var(--border)] bg-[rgba(255,252,248,0.9)] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">來源原文</p>
                <a href={sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex break-all text-[var(--accent)] underline underline-offset-4">
                  {sourceUrl}
                </a>
              </div>
            ) : null}
          </div>
        </article>

        <article className="rounded-[1.6rem] border border-[var(--border)] bg-white/78 p-5">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">Assignment Brief</p>
          <h3 className="mt-3 text-2xl font-semibold">先決定這篇要怎麼打</h3>

          <div className="mt-5 space-y-4">
            <div>
              <p className="mb-2 text-sm text-[var(--muted)]">這篇貼文想達成什麼？</p>
              <div className="flex flex-wrap gap-2">
                {CONTENT_MODES.map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    className={`rounded-full px-4 py-2 text-sm ${contentMode === mode.value ? "bg-[var(--card-dark)] text-white" : "border border-[var(--border)] bg-white text-[var(--foreground)]"}`}
                    onClick={() => setContentMode(mode.value)}
                  >
                    {mode.value}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm text-[var(--muted)]">發布人設</span>
              <select
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none"
                value={selectedAccountId}
                onChange={(event) => setSelectedAccountId(event.target.value)}
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.username}
                    {account.personaLabel ? ` · ${account.personaLabel}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <div>
              <p className="mb-2 text-sm text-[var(--muted)]">優化方向</p>
              <div className="flex flex-wrap gap-2">
                {GOALS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`rounded-full px-4 py-2 text-sm ${goal === item ? "bg-[var(--card-dark)] text-white" : "border border-[var(--border)] bg-white text-[var(--foreground)]"}`}
                    onClick={() => setGoal(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm text-[var(--muted)]">需要 AI 特別注意</p>
              <div className="flex flex-wrap gap-2">
                {OPTIMIZE_FOR.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`rounded-full px-4 py-2 text-sm ${optimizeFor === item ? "bg-[var(--card-dark)] text-white" : "border border-[var(--border)] bg-white text-[var(--foreground)]"}`}
                    onClick={() => setOptimizeFor(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm text-[var(--muted)]">補充說明（選填）</span>
              <textarea
                className="min-h-28 w-full resize-none rounded-2xl border border-[var(--border)] bg-white p-4 outline-none"
                placeholder="例如：不要太像新聞摘要，要像我自己在分享看法；結尾留一個會讓人想留言的問句。"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm text-white"
                onClick={() => {
                  startTransition(async () => {
                    await generateDraft();
                  });
                }}
              >
                {isPending ? "生成中..." : "生成草稿"}
              </button>
              <a href={`/compose?postId=${post.id}&workspace=review`} className="rounded-full border border-[var(--border)] bg-white px-5 py-3 text-sm">
                回舊確認模式
              </a>
            </div>

            {message ? (
              <div
                className={`rounded-2xl px-4 py-3 text-sm ${
                  messageTone === "error"
                    ? "border border-rose-200 bg-rose-50 text-rose-700"
                    : "border border-[var(--border)] bg-white/70 text-[var(--muted)]"
                }`}
              >
                {message}
              </div>
            ) : null}
          </div>
        </article>
      </div>
    </section>
  );
}
