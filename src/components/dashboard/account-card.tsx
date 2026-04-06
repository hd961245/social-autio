import type { AccountCard } from "@/lib/mock-data";

export function AccountCardItem({ account }: { account: AccountCard }) {
  return (
    <article className="glass-panel fade-in-up rounded-[1.75rem] border border-[var(--border)] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">{account.platform}</p>
          <h3 className="mt-2 text-2xl font-semibold">{account.username}</h3>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.2em] ${
            account.tokenStatus === "healthy"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {account.tokenStatus === "healthy" ? "healthy" : "expiring"}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-[var(--muted)]">Followers</p>
          <p className="mt-1 text-2xl font-semibold">{account.followers.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[var(--muted)]">7d Views</p>
          <p className="mt-1 text-2xl font-semibold">{account.weeklyViews.toLocaleString()}</p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-[var(--border)] pt-4 text-sm">
        <p className="text-[var(--muted)]">最後同步：{account.lastSyncedAt}</p>
        <span className="text-[var(--accent)]">查看詳情</span>
      </div>
    </article>
  );
}
