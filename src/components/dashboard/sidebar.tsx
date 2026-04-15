"use client";

import { usePathname } from "next/navigation";
import { dashboardPrimaryLinks } from "@/lib/dashboard-nav";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="glass-panel fade-in-up sticky top-6 overflow-hidden rounded-[2rem] border border-[var(--border)] p-5">
      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.35em] text-[var(--muted)]">Social Audio</p>
        <h1 className="mt-3 text-3xl font-semibold leading-none">Sharp Control</h1>
        <p className="mt-3 max-w-xs text-sm leading-6 text-[var(--muted)]">
          把日常最常走的四件事留在眼前：看盤、選題、發文、復盤。其他系統頁收進上方分組。
        </p>
      </div>

      <div className="mb-5 grid gap-2">
        <a
          href="/compose"
          className="rounded-[1.15rem] bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(187,90,54,0.22)]"
        >
          新增 Threads 草稿
        </a>
        <a
          href="/desk?tab=engine"
          className="rounded-[1.15rem] border border-[var(--border)] bg-white/72 px-4 py-3 text-sm font-semibold text-[var(--foreground)]"
        >
          打開 Content Desk
        </a>
      </div>

      <div className="mb-3">
        <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Core Lane</p>
      </div>

      <nav className="space-y-2">
        {dashboardPrimaryLinks.map((item) => {
          const active = pathname === item.href;

          return (
            <a
              key={item.href}
              href={item.href}
              className={`block rounded-[1.2rem] px-4 py-3 text-sm transition ${
                active
                  ? "bg-[var(--card-dark)] text-white shadow-[0_18px_48px_rgba(25,20,15,0.32)]"
                  : "text-[var(--foreground)] hover:bg-white/90"
              }`}
            >
              <span className="block font-semibold">{item.label}</span>
              <span className={`mt-1 block text-xs ${active ? "text-white/65" : "text-[var(--muted)]"}`}>
                {item.hint}
              </span>
            </a>
          );
        })}
      </nav>

      <div className="mt-6 rounded-[1.5rem] bg-[var(--card-dark)] p-5 text-sm text-white">
        <p className="text-[11px] uppercase tracking-[0.3em] text-white/55">Workflow</p>
        <p className="mt-2 text-xl font-semibold">Desk {"->"} Compose {"->"} Analytics</p>
        <p className="mt-2 text-white/72">先在 Desk 看来源、改写成草稿，再回 Compose 和 Analytics 续修与复盘。</p>
      </div>
    </aside>
  );
}
