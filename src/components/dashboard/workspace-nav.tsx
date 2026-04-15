"use client";

import { usePathname } from "next/navigation";
import { dashboardNavGroups } from "@/lib/dashboard-nav";

function isGroupActive(pathname: string, hrefs: string[]) {
  return hrefs.some((href) => pathname === href || pathname.startsWith(`${href}/`));
}

export function WorkspaceNav() {
  const pathname = usePathname();

  return (
    <nav className="glass-panel fade-in-up overflow-x-auto rounded-[1.8rem] border border-[var(--border)] px-4 py-4">
      <div className="flex min-w-max gap-3">
        {dashboardNavGroups.map((group) => {
          const active = isGroupActive(
            pathname,
            group.items.map((item) => item.href)
          );

          return (
            <details
              key={group.id}
              className={`group relative min-w-[220px] rounded-[1.3rem] border px-4 py-3 ${
                active ? "border-[var(--card-dark)] bg-[var(--card-dark)] text-white" : "border-[var(--border)] bg-white/72"
              }`}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                <a href={group.primaryHref} className="block min-w-0">
                  <span className="block text-sm font-semibold">{group.label}</span>
                  <span className={`mt-1 block text-xs ${active ? "text-white/65" : "text-[var(--muted)]"}`}>{group.hint}</span>
                </a>
                <span className={`text-xs transition group-open:rotate-180 ${active ? "text-white/70" : "text-[var(--muted)]"}`}>
                  ▼
                </span>
              </summary>
              <div className={`mt-3 space-y-2 border-t pt-3 ${active ? "border-white/10" : "border-[var(--border)]"}`}>
                {group.items.map((item) => {
                  const itemActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      className={`block rounded-[1rem] px-3 py-2 text-sm transition ${
                        itemActive
                          ? active
                            ? "bg-white text-[var(--card-dark)]"
                            : "bg-[var(--card-dark)] text-white"
                          : active
                            ? "text-white/80 hover:bg-white/8"
                            : "text-[var(--foreground)] hover:bg-white"
                      }`}
                    >
                      <span className="block font-medium">{item.label}</span>
                      <span className={`mt-1 block text-xs ${itemActive ? "" : active ? "text-white/58" : "text-[var(--muted)]"}`}>
                        {item.hint}
                      </span>
                    </a>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>
    </nav>
  );
}
