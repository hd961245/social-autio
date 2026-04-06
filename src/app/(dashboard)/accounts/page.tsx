import { AccountCardItem } from "@/components/dashboard/account-card";
import { PageIntro } from "@/components/dashboard/page-intro";
import { getAccountSummaries } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const displayAccounts = await getAccountSummaries();

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Accounts"
        title="已連接帳號"
        description="查看 Threads 授權狀態、同步時間與目前可用帳號。後續會在這裡補 token refresh 與更多平台來源。"
        action={
          <a href="/accounts/connect" className="rounded-full bg-[var(--accent)] px-4 py-3 text-sm text-white">
            連接 Threads 帳號
          </a>
        }
      />

      <div className="grid gap-4 xl:grid-cols-2">
        {displayAccounts.map((account) => (
          <AccountCardItem key={account.id} account={account} />
        ))}
        {displayAccounts.length === 0 ? (
          <article className="glass-panel rounded-[1.75rem] border border-dashed border-[var(--border)] p-5 text-sm text-[var(--muted)]">
            尚未有帳號資料。先按右上角的「連接 Threads 帳號」完成第一支帳號授權。
          </article>
        ) : null}
      </div>
    </div>
  );
}
