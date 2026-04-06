"use client";

import { useState, useTransition } from "react";

type KeywordItem = {
  id: string;
  keyword: string;
  matchMode: string;
  isActive: boolean;
};

export function KeywordsManager({ initialKeywords }: { initialKeywords: KeywordItem[] }) {
  const [keywords, setKeywords] = useState(initialKeywords);
  const [keyword, setKeyword] = useState("");
  const [matchMode, setMatchMode] = useState("contains");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              setMessage(null);
              const response = await fetch("/api/keywords", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ keyword, matchMode })
              });
              const result = await response.json();
              if (!response.ok) {
                setMessage(result.message ?? "新增關鍵字失敗");
                return;
              }
              setKeywords((current) => [result.keyword, ...current]);
              setKeyword("");
              setMessage("已新增關鍵字。");
            });
          }}
        >
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Create Keyword</p>
            <h2 className="mt-2 text-3xl font-semibold">新增監控關鍵字</h2>
          </div>
          <input
            className="w-full rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-3"
            placeholder="例如：social audio"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            required
          />
          <select
            className="w-full rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-3"
            value={matchMode}
            onChange={(event) => setMatchMode(event.target.value)}
          >
            <option value="contains">contains</option>
            <option value="exact">exact</option>
            <option value="regex">regex</option>
          </select>
          <button disabled={isPending} className="rounded-full bg-[var(--accent)] px-4 py-3 text-sm text-white">
            {isPending ? "儲存中..." : "新增關鍵字"}
          </button>
          {message ? <p className="text-sm text-[var(--muted)]">{message}</p> : null}
        </form>

        <div className="space-y-3">
          {keywords.map((item) => (
            <article key={item.id} className="rounded-[1.4rem] border border-[var(--border)] bg-white/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{item.keyword}</p>
                  <p className="text-sm text-[var(--muted)]">{item.matchMode}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="rounded-full border border-[var(--border)] px-3 py-1 text-xs"
                    onClick={() =>
                      startTransition(async () => {
                        await fetch(`/api/keywords/${item.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ isActive: !item.isActive })
                        });
                        setKeywords((current) =>
                          current.map((keywordItem) =>
                            keywordItem.id === item.id ? { ...keywordItem, isActive: !keywordItem.isActive } : keywordItem
                          )
                        );
                      })
                    }
                  >
                    {item.isActive ? "停用" : "啟用"}
                  </button>
                  <button
                    className="rounded-full border border-[var(--border)] px-3 py-1 text-xs"
                    onClick={() =>
                      startTransition(async () => {
                        await fetch(`/api/keywords/${item.id}`, { method: "DELETE" });
                        setKeywords((current) => current.filter((keywordItem) => keywordItem.id !== item.id));
                      })
                    }
                  >
                    刪除
                  </button>
                </div>
              </div>
            </article>
          ))}
          {keywords.length === 0 ? <p className="text-sm text-[var(--muted)]">尚未建立任何關鍵字。</p> : null}
        </div>
      </div>
    </section>
  );
}

