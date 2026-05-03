import { PageIntro } from "@/components/dashboard/page-intro";

const CONFIG_AREAS = [
  {
    label: "Accounts",
    href: "/accounts",
    detail: "Threads OAuth、persona、每日自動生文、站台 mission 與 autopilot mode。"
  },
  {
    label: "Sources",
    href: "/sources",
    detail: "starter packs、watchlist、官方 / 深度 / 快訊 / 長期知識來源。"
  },
  {
    label: "WordPress Draft Studio",
    href: "/wordpress",
    detail: "長文草稿、寫作風格記憶、affiliate blocks 與沉澱工作台。"
  },
  {
    label: "Automation",
    href: "/automation",
    detail: "規則、自動化安全護欄，以及需要保留的例外操作。"
  },
  {
    label: "Ops",
    href: "/ops",
    detail: "AI health、schema、Threads 帳號、deploy checklist 與 recovery hints。"
  },
  {
    label: "Knowledge Inputs",
    href: "/help?topic=knowledge-inputs",
    detail: "YouTube / podcast / site discovery / future Notion、Docs、Markdown 的輸入策略。"
  }
] as const;

export const dynamic = "force-dynamic";

export default function ConfigPage() {
  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Config"
        title="站台設定只放在這裡"
        description="Config 不承接日常決策，只負責帳號、來源、WordPress、AI provider、ops 與知識輸入設定。"
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
