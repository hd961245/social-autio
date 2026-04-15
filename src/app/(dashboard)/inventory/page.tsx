import { PageIntro } from "@/components/dashboard/page-intro";
import { getContentInventory } from "@/lib/content-inventory";

export const dynamic = "force-dynamic";

function badgeClass(tone: "neutral" | "warm" | "success" | "dark") {
  if (tone === "success") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (tone === "dark") {
    return "bg-[var(--card-dark)] text-white";
  }

  if (tone === "warm") {
    return "bg-[var(--accent-soft)] text-[var(--accent-strong)]";
  }

  return "bg-stone-200 text-stone-700";
}

function memoryBadgeClass(status: "fresh" | "extend" | "backend" | "stale") {
  if (status === "backend") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "extend") {
    return "bg-[var(--accent-soft)] text-[var(--accent-strong)]";
  }

  if (status === "stale") {
    return "bg-stone-200 text-stone-700";
  }

  return "bg-sky-100 text-sky-700";
}

export default async function InventoryPage() {
  const inventory = await getContentInventory();

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Inventory"
        title="內容庫存台"
        description="從自媒體創業者的角度看內容，不只分平台，而是分階段：哪些還在來源、哪些正在寫、哪些已經驗證、哪些值得沉長文、哪些已接近可變現。"
        action={
          <a href="/desk" className="rounded-full bg-[var(--accent)] px-4 py-3 text-sm text-white">
            回到 Content Desk
          </a>
        }
      />

      <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {inventory.summaryCards.map((card) => (
            <article key={card.label} className="metric-card">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">{card.label}</p>
              <p className="mt-3 text-3xl font-semibold">{card.value}</p>
              <p className="mt-2 text-sm text-[var(--muted)]">{card.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Creator Flow</p>
            <h2 className="mt-2 text-3xl font-semibold">更像創作者每天會走的順序</h2>
          </div>
          <a href="/wordpress" className="text-sm font-medium text-[var(--accent)]">
            去 WordPress 草稿台
          </a>
        </div>
        <div className="mt-6 grid gap-4 xl:grid-cols-5">
          {inventory.workflow.map((step) => (
            <article key={step.label} className="rounded-[1.4rem] border border-[var(--border)] bg-white/72 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">{step.label}</p>
              <p className="mt-3 text-sm leading-7 text-[var(--foreground)]">{step.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {inventory.lanes.map((lane) => (
          <article key={lane.id} className="glass-panel rounded-[2rem] border border-[var(--border)] p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">{lane.label}</p>
                <p className="mt-2 text-2xl font-semibold">{lane.description}</p>
              </div>
              <span className="pill-tag">{lane.items.length} items</span>
            </div>
            <div className="mt-5 space-y-3">
              {lane.items.map((item) => (
                <article key={item.id} className="rounded-[1.5rem] border border-[var(--border)] bg-white/75 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{item.meta}</p>
                    <span className={`rounded-full px-3 py-1 text-xs uppercase ${badgeClass(item.badgeTone)}`}>{item.badge}</span>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{item.detail}</p>
                  <div className="mt-4">
                    <a href={item.href} className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm">
                      打開
                    </a>
                  </div>
                </article>
              ))}
              {lane.items.length === 0 ? (
                <article className="rounded-[1.5rem] border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)]">
                  目前這一欄還沒有內容，等你再累積一些來源、草稿或 metrics 後，這裡會更有判讀價值。
                </article>
              ) : null}
            </div>
          </article>
        ))}
      </section>

      <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">WordPress Draft Memory</p>
            <h2 className="mt-2 text-3xl font-semibold">WordPress 草稿現在在哪一步</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
              這裡不是單純列草稿，而是幫你判斷每篇更像新草稿、待補長文、已可進後台細修，還是已經積壓太久。
            </p>
          </div>
          <a href="/wordpress" className="text-sm font-medium text-[var(--accent)]">
            打開 WP 工作台
          </a>
        </div>
        <div className="mt-6 grid gap-4">
          {inventory.wordpressDraftMemory.map((draft) => (
            <article key={draft.id} className="rounded-[1.6rem] border border-[var(--border)] bg-white/75 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{draft.siteLabel}</p>
                    <span className={`rounded-full px-3 py-1 text-xs uppercase ${memoryBadgeClass(draft.status)}`}>{draft.statusLabel}</span>
                  </div>
                  <h3 className="mt-2 text-xl font-semibold">{draft.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{draft.detail}</p>
                  <p className="mt-3 text-sm text-[var(--muted)]">最後更新：{draft.updatedAt}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-3">
                  <a href={draft.href} className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm text-white">
                    繼續整理
                  </a>
                  {draft.backendHref ? (
                    <a href={draft.backendHref} target="_blank" rel="noreferrer" className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm">
                      打開後台草稿
                    </a>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
          {inventory.wordpressDraftMemory.length === 0 ? (
            <article className="rounded-[1.6rem] border border-dashed border-[var(--border)] p-5 text-sm text-[var(--muted)]">
              目前還沒有可追蹤的 WordPress 草稿。先從 Threads sync 一篇，或直接在 WordPress 草稿台建立第一篇。
            </article>
          ) : null}
        </div>
      </section>
    </div>
  );
}
