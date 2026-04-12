"use client";

import { useState, useTransition } from "react";

type DraftSummary = {
  id: string;
  platform: string;
  title: string;
  status: string;
};

type IngestionSummary = {
  id: string;
  sourceType: string;
  title: string;
  createdAt: string;
  generatedCount: number;
};

export function ContentEngineForm({
  initialPersonaPrompt,
  initialTone,
  recentIngestions,
  recentDrafts
}: {
  initialPersonaPrompt: string;
  initialTone: string;
  recentIngestions: IngestionSummary[];
  recentDrafts: DraftSummary[];
}) {
  const [sourceType, setSourceType] = useState<"url" | "text" | "image">("text");
  const [title, setTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [rawText, setRawText] = useState("");
  const [imageUrls, setImageUrls] = useState("");
  const [personaPrompt, setPersonaPrompt] = useState(initialPersonaPrompt);
  const [tone, setTone] = useState(initialTone);
  const [message, setMessage] = useState<string | null>(null);
  const [ingestions, setIngestions] = useState(recentIngestions);
  const [drafts, setDrafts] = useState(recentDrafts);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Content Engine</p>
          <h2 className="mt-2 text-3xl font-semibold">輸入素材，直接拆出多平台草稿</h2>
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
                  defaultTone: tone
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

              setMessage("草稿已生成，請到右側或 Posts 頁查看。");
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
                ...(sourceType ? (["threads", "wordpress"] as const).map((platform) => ({
                  id: `${result.ingestionId}-${platform}`,
                  platform,
                  title: title || "未命名素材",
                  status: "draft"
                })) : [])
              ]);
            });
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
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

          {sourceType === "url" ? (
            <div className="rounded-3xl bg-white/85 p-4">
              <label className="mb-2 block text-sm text-[var(--muted)]">來源網址</label>
              <input
                className="w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3 outline-none"
                placeholder="https://..."
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
                required
              />
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

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl bg-white/85 p-4">
              <label className="mb-2 block text-sm text-[var(--muted)]">Persona Prompt</label>
              <textarea
                className="min-h-36 w-full resize-none rounded-2xl border border-[var(--border)] bg-transparent p-4 outline-none"
                value={personaPrompt}
                onChange={(event) => setPersonaPrompt(event.target.value)}
              />
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
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm text-white"
          >
            {isPending ? "生成中..." : "生成多平台草稿"}
          </button>
          {message ? <p className="text-sm text-[var(--muted)]">{message}</p> : null}
        </form>
      </section>

      <div className="space-y-6">
        <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
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
              </article>
            ))}
            {drafts.length === 0 ? <p className="text-sm text-[var(--muted)]">目前還沒有草稿。</p> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
