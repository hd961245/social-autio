"use client";

import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "總覽", hint: "KPI + health" },
  { href: "/accounts", label: "帳號", hint: "OAuth + status" },
  { href: "/compose", label: "發文", hint: "create + publish" },
  { href: "/posts", label: "排程", hint: "queue + history" },
  { href: "/analytics", label: "分析", hint: "insights + quota" },
  { href: "/keywords", label: "關鍵字", hint: "monitor + hits" },
  { href: "/automation", label: "自動化", hint: "rules + safety" }
  ,
  { href: "/wordpress", label: "WordPress", hint: "blog + publish" }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="glass-panel fade-in-up sticky top-6 rounded-[2rem] border border-[var(--border)] p-6">
      <div className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.35em] text-[var(--muted)]">Social Audio</p>
        <h1 className="mt-3 text-4xl font-semibold leading-none">Control Room</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          一個給自己用的社群操作台。先把 Threads 授權、發文、監控和後續自動化工作流收進同一個界面。
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
                  ? "bg-[var(--card-dark)] text-white shadow-[0_14px_40px_rgba(25,20,15,0.24)]"
                  : "text-[var(--foreground)] hover:bg-white/80"
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

      <div className="mt-8 rounded-[1.5rem] bg-[var(--accent)] p-5 text-sm text-white">
        <p className="text-[11px] uppercase tracking-[0.3em] text-white/70">MVP Scope</p>
        <p className="mt-2 text-xl font-semibold">Phase 1 + 2</p>
        <p className="mt-2 text-white/80">帳號連接、發文、基本監控與 token 健康狀態。</p>
        <div className="mt-4 grid gap-2 text-xs text-white/70">
          <div className="flex items-center justify-between">
            <span>Threads OAuth</span>
            <span>Ready</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Immediate Publish</span>
            <span>v1</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Insights</span>
            <span>Next</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
