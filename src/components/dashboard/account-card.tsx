import type { AccountOperatingSummary } from "@/lib/dashboard-data";

export function AccountCardItem({ account }: { account: AccountOperatingSummary }) {
  return (
    <article className="glass-panel fade-in-up rounded-[1.75rem] border border-[var(--border)] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">{account.platform}</p>
          <h3 className="mt-2 text-2xl font-semibold">{account.username}</h3>
          <p className="mt-2 max-w-xl text-sm leading-7 text-[var(--muted)]">{account.accountMission}</p>
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

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 text-sm">
        <div>
          <p className="text-[var(--muted)]">Followers</p>
          <p className="mt-1 text-2xl font-semibold">{account.followers.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[var(--muted)]">7d Views</p>
          <p className="mt-1 text-2xl font-semibold">{account.weeklyViews.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[var(--muted)]">今日已發 / 排程</p>
          <p className="mt-1 text-2xl font-semibold">
            {account.todayPublishedCount} / {account.todayScheduledCount}
          </p>
        </div>
        <div>
          <p className="text-[var(--muted)]">待你介入</p>
          <p className="mt-1 text-2xl font-semibold">{account.exceptionCount}</p>
        </div>
      </div>

      {account.personaLabel || account.defaultTone || account.laneHint ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {account.personaLabel ? <span className="pill-tag text-xs">{account.personaLabel}</span> : null}
          {account.defaultTone ? <span className="pill-tag text-xs">{account.defaultTone}</span> : null}
          {account.autopilotEnabled ? (
            <span className="pill-tag text-xs">{account.autoGenerateMode === "scheduled" ? "高自動排程" : "高自動備稿"}</span>
          ) : (
            <span className="pill-tag text-xs">手動帳號</span>
          )}
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[1.1rem] border border-[var(--border)] bg-white/72 px-4 py-3 text-sm">
          <p className="text-[var(--muted)]">Publishing lane</p>
          <p className="mt-2 text-[var(--foreground)]">
            可直發 {account.directDraftCount} · 待拍板 {account.reviewDraftCount} · 優化稿 {account.optimizationDraftCount}
          </p>
        </div>
        <div className="rounded-[1.1rem] border border-[var(--border)] bg-white/72 px-4 py-3 text-sm">
          <p className="text-[var(--muted)]">WordPress lane</p>
          <p className="mt-2 text-[var(--foreground)]">
            已沉草稿 {account.wordpressDraftCount} · 待擴寫 {account.wordpressExpansionCount}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-[1.1rem] border border-[var(--border)] bg-white/72 px-4 py-3 text-sm">
        <p className="text-[var(--muted)]">Source preference</p>
        <p className="mt-2 break-words leading-7 text-[var(--foreground)]">{account.sourcePreference}</p>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-[var(--border)] pt-4 text-sm">
        <div>
          <p className="text-[var(--muted)]">最後同步：{account.lastSyncedAt}</p>
          <p className="mt-1 text-[var(--muted)]">
            {account.needsDailyPost
              ? "今天還沒滿一篇，系統會優先補這條線。"
              : account.latestPublishedAt
                ? `最近已發：${account.latestPublishedAt}`
                : "最近還沒有已發布內容"}
          </p>
        </div>
        <a href={`/accounts/${account.id}`} className="text-[var(--accent)]">
          進營運線
        </a>
      </div>
    </article>
  );
}
