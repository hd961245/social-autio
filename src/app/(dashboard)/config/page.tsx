import { PageIntro } from "@/components/dashboard/page-intro";

const CONFIG_AREAS = [
  {
    label: "Sources",
    href: "/sources",
    detail: "管理來源供應鏈、starter packs 與 discovery；日常分發請回 Accounts / PM Ops。"
  },
  {
    label: "Automation",
    href: "/automation",
    detail: "每日日報、背景任務、通知通道與保險機制。"
  },
  {
    label: "Ops",
    href: "/ops",
    detail: "AI health、GA4 / GSC、schema、Threads 帳號、deploy checklist 與 recovery hints。"
  },
  {
    label: "Knowledge Inputs",
    href: "/help?topic=knowledge-inputs",
    detail: "YouTube / podcast / site discovery / future Notion、Docs、Markdown 的輸入策略。"
  },
  {
    label: "WordPress / Referral Surface",
    href: "/wordpress",
    detail: "長文 CTA、affiliate、未來 referral / 轉介頁與增長承接面。"
  }
] as const;

export const dynamic = "force-dynamic";

export default function ConfigPage() {
  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Config"
        title="站台設定只放在這裡"
        description="Config 不承接日常營運。帳號日常請去 Accounts、總控盤請去 PM Ops，這裡只留設定、診斷與擴張接口。"
      />

      <section className="grid gap-4 xl:grid-cols-2">
        {CONFIG_AREAS.map((area) => (
          <a
            key={area.label}
            href={area.href}
            className="glass-panel rounded-[1.9rem] border border-[var(--border)] p-5 transition hover:bg-white/82"
          >
            <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">{area.label}</p>
            <p className="mt-3 text-sm leading-7 text-[var(--foreground)]">{area.detail}</p>
            <span className="mt-4 inline-flex text-sm font-medium text-[var(--accent)]">打開設定</span>
          </a>
        ))}
      </section>
    </div>
  );
}
