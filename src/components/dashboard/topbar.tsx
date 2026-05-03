import { getActiveAccountSummary, getDatabaseStatus } from "@/lib/dashboard-data";

export async function Topbar() {
  const [activeAccount, databaseStatus] = await Promise.all([getActiveAccountSummary(), getDatabaseStatus()]);

  return (
    <header className="glass-panel soft-grid overflow-hidden rounded-[2rem] border border-[var(--border)] px-6 py-5 fade-in-up">
      <div className="relative z-10 flex min-w-0 flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.35em] text-[var(--muted)]">PM Ops Workspace</p>
          <h2 className="mt-2 text-[2rem] font-semibold leading-tight xl:text-3xl">先看 mission，再決定今天哪些內容值得被放大</h2>
          <p className="mt-3 break-words text-sm text-[var(--muted)]">
            {activeAccount
              ? `目前主控帳號：${activeAccount.platform} ${activeAccount.username} · 最後同步 ${activeAccount.lastSyncedAt}`
              : "目前尚未有啟用中的 Threads 帳號，先到 Accounts 完成授權。"}
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3 2xl:min-w-[420px]">
          <div className="rounded-[1.2rem] border border-[var(--border)] bg-white/60 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.25em] text-[var(--muted)]">今天主線</p>
            <p className="mt-1 break-words text-sm font-semibold">PM Ops → Review → Compose → WordPress</p>
          </div>
          <div className="rounded-[1.2rem] border border-[var(--border)] bg-white/60 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.25em] text-[var(--muted)]">目前帳號</p>
            <p className="mt-1 text-sm font-semibold">{activeAccount ? activeAccount.username : "Not Connected"}</p>
          </div>
          <div className="rounded-[1.2rem] border border-[var(--border)] bg-[var(--card-dark)] px-4 py-3 text-white">
            <p className="text-[11px] uppercase tracking-[0.25em] text-white/60">WordPress</p>
            <p className="mt-1 text-sm font-semibold">{databaseStatus.ready ? "只留草稿，不自動發布" : "Setup First"}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
