"use client";

import { useState, useTransition } from "react";

type AccountPersona = {
  id: string;
  username: string;
  platform: string;
  personaLabel: string;
  personaPrompt: string;
  defaultTone: string;
  topicFocus: string;
  hookStyle: string;
  ctaStyle: string;
  voiceGuardrails: string;
};

export function AccountPersonaManager({ accounts }: { accounts: AccountPersona[] }) {
  const [localAccounts, setLocalAccounts] = useState(accounts);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Persona Studio</p>
          <h2 className="mt-2 text-3xl font-semibold">每個 Threads 帳號一套人設</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
            如果你之後會有多個 Threads，這裡就是把不同人設拆開的地方。Content Engine 之後會依你選的帳號，套用對應語氣和人設基底。
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        {localAccounts
          .filter((account) => account.platform === "threads")
          .map((account, index) => (
            <article key={account.id} className="rounded-[1.6rem] border border-[var(--border)] bg-white/75 p-5">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{account.platform}</p>
                <h3 className="text-xl font-semibold">{account.username}</h3>
              </div>

              <div className="grid gap-4 lg:grid-cols-[0.8fr_0.8fr_1.4fr]">
                <label className="rounded-[1.25rem] border border-[var(--border)] bg-white p-4">
                  <span className="mb-2 block text-sm text-[var(--muted)]">人設名稱</span>
                  <input
                    className="w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3 outline-none"
                    placeholder="例如：冷靜創業觀察者"
                    value={account.personaLabel}
                    onChange={(event) => {
                      const value = event.target.value;
                      setLocalAccounts((current) =>
                        current.map((item, itemIndex) => (itemIndex === index ? { ...item, personaLabel: value } : item))
                      );
                    }}
                  />
                </label>

                <label className="rounded-[1.25rem] border border-[var(--border)] bg-white p-4">
                  <span className="mb-2 block text-sm text-[var(--muted)]">預設語氣</span>
                  <select
                    className="w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3 outline-none"
                    value={account.defaultTone}
                    onChange={(event) => {
                      const value = event.target.value;
                      setLocalAccounts((current) =>
                        current.map((item, itemIndex) => (itemIndex === index ? { ...item, defaultTone: value } : item))
                      );
                    }}
                  >
                    <option value="">沿用全域預設</option>
                    <option value="sharp-observer">Sharp Observer</option>
                    <option value="mystic-guide">Mystic Guide</option>
                    <option value="founder-journal">Founder Journal</option>
                  </select>
                </label>

                <label className="rounded-[1.25rem] border border-[var(--border)] bg-white p-4">
                  <span className="mb-2 block text-sm text-[var(--muted)]">人設基底</span>
                  <textarea
                    className="min-h-36 w-full resize-none rounded-2xl border border-[var(--border)] bg-transparent p-4 outline-none"
                    placeholder="描述這個帳號像誰、講話節奏、立場、會用什麼角度切題。"
                    value={account.personaPrompt}
                    onChange={(event) => {
                      const value = event.target.value;
                      setLocalAccounts((current) =>
                        current.map((item, itemIndex) => (itemIndex === index ? { ...item, personaPrompt: value } : item))
                      );
                    }}
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <label className="rounded-[1.25rem] border border-[var(--border)] bg-white p-4">
                  <span className="mb-2 block text-sm text-[var(--muted)]">題材範圍</span>
                  <textarea
                    className="min-h-28 w-full resize-none rounded-2xl border border-[var(--border)] bg-transparent p-4 outline-none"
                    placeholder="這個 persona 平常適合談什麼，不適合談什麼。"
                    value={account.topicFocus}
                    onChange={(event) => {
                      const value = event.target.value;
                      setLocalAccounts((current) =>
                        current.map((item, itemIndex) => (itemIndex === index ? { ...item, topicFocus: value } : item))
                      );
                    }}
                  />
                </label>

                <label className="rounded-[1.25rem] border border-[var(--border)] bg-white p-4">
                  <span className="mb-2 block text-sm text-[var(--muted)]">Hook 風格</span>
                  <textarea
                    className="min-h-28 w-full resize-none rounded-2xl border border-[var(--border)] bg-transparent p-4 outline-none"
                    placeholder="例如：先講結論、反直覺句、創業者視角切入。"
                    value={account.hookStyle}
                    onChange={(event) => {
                      const value = event.target.value;
                      setLocalAccounts((current) =>
                        current.map((item, itemIndex) => (itemIndex === index ? { ...item, hookStyle: value } : item))
                      );
                    }}
                  />
                </label>

                <label className="rounded-[1.25rem] border border-[var(--border)] bg-white p-4">
                  <span className="mb-2 block text-sm text-[var(--muted)]">CTA 風格</span>
                  <textarea
                    className="min-h-28 w-full resize-none rounded-2xl border border-[var(--border)] bg-transparent p-4 outline-none"
                    placeholder="例如：偏討論、偏導流、偏追蹤、偏收藏。"
                    value={account.ctaStyle}
                    onChange={(event) => {
                      const value = event.target.value;
                      setLocalAccounts((current) =>
                        current.map((item, itemIndex) => (itemIndex === index ? { ...item, ctaStyle: value } : item))
                      );
                    }}
                  />
                </label>

                <label className="rounded-[1.25rem] border border-[var(--border)] bg-white p-4">
                  <span className="mb-2 block text-sm text-[var(--muted)]">語氣禁區</span>
                  <textarea
                    className="min-h-28 w-full resize-none rounded-2xl border border-[var(--border)] bg-transparent p-4 outline-none"
                    placeholder="例如：不要雞湯、不要太油、不要硬賣、不要像公告文。"
                    value={account.voiceGuardrails}
                    onChange={(event) => {
                      const value = event.target.value;
                      setLocalAccounts((current) =>
                        current.map((item, itemIndex) => (itemIndex === index ? { ...item, voiceGuardrails: value } : item))
                      );
                    }}
                  />
                </label>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={isPending}
                  className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm text-white disabled:opacity-60"
                  onClick={() => {
                    startTransition(async () => {
                      setMessage(null);
                      const response = await fetch(`/api/accounts/${account.id}/persona`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          personaLabel: localAccounts[index]?.personaLabel ?? "",
                          personaPrompt: localAccounts[index]?.personaPrompt ?? "",
                          defaultTone: localAccounts[index]?.defaultTone ?? "",
                          topicFocus: localAccounts[index]?.topicFocus ?? "",
                          hookStyle: localAccounts[index]?.hookStyle ?? "",
                          ctaStyle: localAccounts[index]?.ctaStyle ?? "",
                          voiceGuardrails: localAccounts[index]?.voiceGuardrails ?? ""
                        })
                      });
                      const result = await response.json();
                      setMessage(response.ok ? `已更新 ${account.username} 的 persona。` : result.message ?? "更新失敗");
                    });
                  }}
                >
                  {isPending ? "儲存中..." : "儲存這個人設"}
                </button>
                <a href={`/compose?accountId=${account.id}`} className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm">
                  用這個帳號開稿
                </a>
              </div>
            </article>
          ))}

        {localAccounts.filter((account) => account.platform === "threads").length === 0 ? (
          <article className="rounded-[1.6rem] border border-dashed border-[var(--border)] p-5 text-sm text-[var(--muted)]">
            目前還沒有 Threads 帳號。先完成授權，之後每個帳號都可以有自己的語氣和人設。
          </article>
        ) : null}
      </div>

      {message ? <p className="mt-4 text-sm text-[var(--muted)]">{message}</p> : null}
    </section>
  );
}
