"use client";

import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "總覽", hint: "Threads KPI + health" },
  { href: "/accounts", label: "帳號", hint: "Threads OAuth + status" },
  { href: "/compose", label: "發文", hint: "publish + draft" },
  { href: "/posts", label: "Queue", hint: "threads queue + wp drafts" },
  { href: "/analytics", label: "分析", hint: "insights + quota" },
  { href: "/content-engine", label: "內容引擎", hint: "rewrite + split" },
  { href: "/sources", label: "來源", hint: "watchlist + import" },
  { href: "/keywords", label: "關鍵字", hint: "monitor + hits" },
  { href: "/automation", label: "自動化", hint: "rules + safety" },
  { href: "/wordpress", label: "WP 草稿", hint: "connect + draft sync" }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="glass-panel fade-in-up sticky top-6 overflow-hidden rounded-[2rem] border border-[var(--border)] p-6">
      <div className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.35em] text-[var(--muted)]">Social Audio</p>
        <h1 className="mt-3 text-4xl font-semibold leading-none">Sharp Control</h1>
        <p className="mt-3 max-w-xs text-sm leading-6 text-[var(--muted)]">
          給自己用的 Threads 主控台。主線很單純: 授權、發文、看數據、掃命中，再把長文沉到 WordPress 草稿。
        </p>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => {
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

      <div className="mt-8 rounded-[1.5rem] bg-[var(--card-dark)] p-5 text-sm text-white">
        <p className="text-[11px] uppercase tracking-[0.3em] text-white/55">Operating Focus</p>
        <p className="mt-2 text-xl font-semibold">Threads First</p>
        <p className="mt-2 text-white/72">先把最常做的動作收乾淨，WordPress 只留成長文草稿，不碰正式發布。</p>
        <div className="mt-4 grid gap-2 text-xs text-white/70">
          <div className="flex items-center justify-between">
            <span>Threads OAuth</span>
            <span>Ready</span>
          </div>
          <div className="flex items-center justify-between">
            <span>WordPress Drafts</span>
            <span>Live</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Remote Publish</span>
            <span>Off</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
