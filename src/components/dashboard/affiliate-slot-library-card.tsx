"use client";

import { useState, useTransition } from "react";

export function AffiliateSlotLibraryCard({
  initialPrimary,
  initialSecondary,
  initialDisclosure,
  initialCta
}: {
  initialPrimary: string;
  initialSecondary: string;
  initialDisclosure: string;
  initialCta: string;
}) {
  const [primary, setPrimary] = useState(initialPrimary);
  const [secondary, setSecondary] = useState(initialSecondary);
  const [disclosure, setDisclosure] = useState(initialDisclosure);
  const [cta, setCta] = useState(initialCta);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Affiliate Library</p>
        <h2 className="mt-2 text-3xl font-semibold">聯盟模組庫</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
          先把你常用的推薦模組、揭露說明和 CTA 存起來，之後生成草稿或在 Compose 裡都能直接套用。
        </p>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <label className="rounded-3xl bg-white/85 p-4">
          <span className="mb-2 block text-sm text-[var(--muted)]">主推薦模組</span>
          <textarea
            className="min-h-28 w-full resize-none rounded-2xl border border-[var(--border)] bg-transparent p-4 outline-none"
            value={primary}
            onChange={(event) => setPrimary(event.target.value)}
            placeholder="例如：主力工具名稱、適用人群、你通常怎麼介紹它"
          />
        </label>
        <label className="rounded-3xl bg-white/85 p-4">
          <span className="mb-2 block text-sm text-[var(--muted)]">備用推薦 / 延伸資源</span>
          <textarea
            className="min-h-28 w-full resize-none rounded-2xl border border-[var(--border)] bg-transparent p-4 outline-none"
            value={secondary}
            onChange={(event) => setSecondary(event.target.value)}
            placeholder="例如：替代方案、補充資源、第二推薦"
          />
        </label>
        <label className="rounded-3xl bg-white/85 p-4">
          <span className="mb-2 block text-sm text-[var(--muted)]">Disclosure</span>
          <textarea
            className="min-h-24 w-full resize-none rounded-2xl border border-[var(--border)] bg-transparent p-4 outline-none"
            value={disclosure}
            onChange={(event) => setDisclosure(event.target.value)}
            placeholder="例如：本文可能含聯盟連結，若你透過這些連結購買，我可能獲得佣金，但不影響你的價格。"
          />
        </label>
        <label className="rounded-3xl bg-white/85 p-4">
          <span className="mb-2 block text-sm text-[var(--muted)]">CTA</span>
          <textarea
            className="min-h-24 w-full resize-none rounded-2xl border border-[var(--border)] bg-transparent p-4 outline-none"
            value={cta}
            onChange={(event) => setCta(event.target.value)}
            placeholder="例如：如果你想直接試用，我把最常用的版本整理在這裡。"
          />
        </label>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <button
          disabled={isPending}
          className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm text-white disabled:opacity-60"
          onClick={() =>
            startTransition(async () => {
              setMessage(null);
              const response = await fetch("/api/automation/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  affiliateBlockPrimary: primary,
                  affiliateBlockSecondary: secondary,
                  affiliateDisclosure: disclosure,
                  affiliateCta: cta
                })
              });
              const result = await response.json();
              setMessage(response.ok ? "已更新聯盟模組庫。" : result.message ?? "更新失敗");
            })
          }
        >
          {isPending ? "儲存中..." : "儲存模組庫"}
        </button>
        {message ? <p className="text-sm text-[var(--muted)]">{message}</p> : null}
      </div>
    </section>
  );
}
