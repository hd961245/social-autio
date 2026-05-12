import Link from "next/link";

import { PageIntro } from "@/components/dashboard/page-intro";

export const dynamic = "force-static";

export default function DeskPage() {
  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="PM Ops"
        title="Desk Safe Mode"
        description="這個頁面目前進入最小安全模式，用來確認 v3 service 本身能不能正常回應，而不是再被 server-side diagnostics 或 dashboard 取數拖垮。"
        action={
          <div className="flex flex-wrap gap-3">
            <Link href="/accounts" className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm text-white">
              去 Accounts
            </Link>
            <Link href="/ops" className="rounded-full border border-[var(--border)] bg-white/80 px-4 py-2 text-sm">
              去 Ops
            </Link>
          </div>
        }
      />

      <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
        <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Status</p>
        <h2 className="mt-2 text-3xl font-semibold">這是緊急保護頁</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">
          如果你現在能看到這頁，代表 `desk` 的白頁問題不是路由本身，而是先前頁面裡的 server-side 資料讀取或 runtime
          diagnostics。
        </p>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {[
            {
              label: "Desk Route",
              value: "Alive",
              detail: "頁面本體可以正常 render。"
            },
            {
              label: "Next Step",
              value: "Rebuild Data",
              detail: "接下來會逐段把原本的 dashboard 資料區塊加回來。"
            },
            {
              label: "v3 Check",
              value: "Isolation",
              detail: "這版是拿來切開 route 問題和 runtime / data 問題。"
            }
          ].map((card) => (
            <article key={card.label} className="rounded-[1.2rem] border border-[var(--border)] bg-white/82 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{card.label}</p>
              <p className="mt-3 text-2xl font-semibold">{card.value}</p>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{card.detail}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
