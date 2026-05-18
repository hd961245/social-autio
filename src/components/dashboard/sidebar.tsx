"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dashboardPrimaryLinks } from "@/lib/dashboard-nav";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="glass-panel fade-in-up sticky top-6 overflow-hidden rounded-[2rem] border border-[var(--border)] p-4 xl:p-5">
      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.35em] text-[var(--muted)]">Social Audio</p>
        <h1 className="mt-3 text-[2rem] font-semibold leading-none xl:text-3xl">Content OS</h1>
        <p className="mt-3 max-w-xs text-sm leading-6 text-[var(--muted)]">
          把內容經營收成單一營運台：先沉澱語料與素材，再交給 AI 起草、配圖、發布與學習回寫。
        </p>
      </div>

      <div className="mb-5 grid gap-2">
        <Link
          href="/desk"
          className="rounded-[1.15rem] bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(187,90,54,0.22)]"
        >
          打開 PM Ops
        </Link>
        <Link
          href="/review"
          className="rounded-[1.15rem] border border-[var(--border)] bg-white/72 px-4 py-3 text-sm font-semibold text-[var(--foreground)]"
        >
          去 Review 拍板
        </Link>
      </div>

      <div className="mb-3">
        <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Operating Lane</p>
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
    </aside>
  );
}
