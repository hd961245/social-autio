import { AccountCardItem } from "@/components/dashboard/account-card";
import { DatabaseBanner } from "@/components/dashboard/database-banner";
import { KeywordTable } from "@/components/dashboard/keyword-table";
import { MetricsChart } from "@/components/dashboard/metrics-chart";
import { PageIntro } from "@/components/dashboard/page-intro";
import { getAccountSummaries, getDashboardStats, getDatabaseStatus, getKeywordHitSummaries } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [stats, accounts, keywordHits, databaseStatus] = await Promise.all([
    getDashboardStats(),
    getAccountSummaries(),
    getKeywordHitSummaries(),
    getDatabaseStatus()
  ]);

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Overview"
        title="Threads-first operations dashboard"
        description="把授權、發布、監控與後續回應流程收進同一個操作台。這一版先把最常用的第一層工作面做穩。"
        action={
          <a
            href="/compose"
            className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm uppercase tracking-[0.2em] text-white shadow-[0_18px_40px_rgba(187,90,54,0.22)]"
          >
            New Post
          </a>
        }
      />

      <DatabaseBanner status={databaseStatus} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <article key={item.label} className="glass-panel fade-in-up rounded-[1.75rem] border border-[var(--border)] p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">{item.label}</p>
            <p className="mt-3 text-4xl font-semibold">{item.value}</p>
            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{item.detail}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <MetricsChart />
        <div className="space-y-4">
          {accounts.map((account) => (
            <AccountCardItem key={account.id} account={account} />
          ))}
          {accounts.length === 0 ? (
            <article className="glass-panel rounded-[1.75rem] border border-dashed border-[var(--border)] p-5 text-sm text-[var(--muted)]">
              還沒有已連接帳號，先到 Accounts 頁完成 Threads 授權。
            </article>
          ) : null}
        </div>
      </section>

      <KeywordTable hits={keywordHits} />
    </div>
  );
}
