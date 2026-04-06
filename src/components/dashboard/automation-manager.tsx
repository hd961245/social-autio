"use client";

import { useState, useTransition } from "react";

type RuleItem = {
  id: string;
  name: string;
  isActive: boolean;
  dailyLimit: number;
  triggerConfig: string;
  actionConfig: string;
};

type AccountOption = {
  id: string;
  username: string;
  platform: string;
};

export function AutomationManager({
  initialRules,
  accounts
}: {
  initialRules: RuleItem[];
  accounts: AccountOption[];
}) {
  const [rules, setRules] = useState(initialRules);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: "",
    triggerKeyword: "",
    replyTemplate: "",
    accountId: accounts[0]?.id ?? "",
    dailyLimit: 50
  });

  return (
    <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              const response = await fetch("/api/automation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form)
              });
              const result = await response.json();
              if (!response.ok) {
                setMessage(result.message ?? "規則建立失敗");
                return;
              }
              setRules((current) => [result.rule, ...current]);
              setMessage("已建立規則。");
              setForm((current) => ({ ...current, name: "", triggerKeyword: "", replyTemplate: "" }));
            });
          }}
        >
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Rule Builder</p>
            <h2 className="mt-2 text-3xl font-semibold">建立回覆規則</h2>
          </div>
          <input
            className="w-full rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-3"
            placeholder="規則名稱"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            required
          />
          <input
            className="w-full rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-3"
            placeholder="觸發關鍵字"
            value={form.triggerKeyword}
            onChange={(event) => setForm((current) => ({ ...current, triggerKeyword: event.target.value }))}
            required
          />
          <textarea
            className="min-h-32 w-full rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-3"
            placeholder="回覆模板，例如：謝謝 {author}，我們也在觀察 {keyword} 這個話題。"
            value={form.replyTemplate}
            onChange={(event) => setForm((current) => ({ ...current, replyTemplate: event.target.value }))}
            required
          />
          <select
            className="w-full rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-3"
            value={form.accountId}
            onChange={(event) => setForm((current) => ({ ...current, accountId: event.target.value }))}
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.platform} {account.username}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            max={500}
            className="w-full rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-3"
            value={form.dailyLimit}
            onChange={(event) => setForm((current) => ({ ...current, dailyLimit: Number(event.target.value) }))}
          />
          <button disabled={isPending} className="rounded-full bg-[var(--accent)] px-4 py-3 text-sm text-white">
            {isPending ? "建立中..." : "建立規則"}
          </button>
          {message ? <p className="text-sm text-[var(--muted)]">{message}</p> : null}
        </form>

        <div className="space-y-3">
          {rules.map((rule) => (
            <article key={rule.id} className="rounded-[1.4rem] border border-[var(--border)] bg-white/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{rule.name}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">daily limit {rule.dailyLimit}</p>
                  <p className="mt-2 text-xs text-[var(--muted)]">{rule.triggerConfig}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="rounded-full border border-[var(--border)] px-3 py-1 text-xs"
                    onClick={() =>
                      startTransition(async () => {
                        await fetch(`/api/automation/${rule.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ isActive: !rule.isActive })
                        });
                        setRules((current) =>
                          current.map((item) => (item.id === rule.id ? { ...item, isActive: !item.isActive } : item))
                        );
                      })
                    }
                  >
                    {rule.isActive ? "停用" : "啟用"}
                  </button>
                  <button
                    className="rounded-full border border-[var(--border)] px-3 py-1 text-xs"
                    onClick={() =>
                      startTransition(async () => {
                        await fetch(`/api/automation/${rule.id}`, { method: "DELETE" });
                        setRules((current) => current.filter((item) => item.id !== rule.id));
                      })
                    }
                  >
                    刪除
                  </button>
                </div>
              </div>
            </article>
          ))}
          {rules.length === 0 ? <p className="text-sm text-[var(--muted)]">尚未建立任何規則。</p> : null}
        </div>
      </div>
    </section>
  );
}

