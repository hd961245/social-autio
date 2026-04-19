import { AccountCardItem } from "@/components/dashboard/account-card";
import { AccountPersonaManager } from "@/components/dashboard/account-persona-manager";
import { PageIntro } from "@/components/dashboard/page-intro";
import { prisma } from "@/lib/prisma";
import { getAccountSummaries } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const displayAccounts = await getAccountSummaries();
  const rawAccounts = await prisma.platformAccount.findMany({
    where: { isActive: true },
    orderBy: [{ platform: "asc" }, { createdAt: "desc" }]
  }).catch(() => []);

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Accounts"
        title="已連接帳號"
        description="查看 Threads 授權狀態、同步時間與目前可用帳號。每支 Threads 帳號也可以在這裡設定自己的人設，以及每天自動生文的節奏。"
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

      <AccountPersonaManager
        accounts={rawAccounts.map((account) => ({
          id: account.id,
          username: `@${account.platformUsername}`,
          platform: account.platform,
          personaLabel: account.personaLabel ?? "",
          personaPrompt: account.personaPrompt ?? "",
          defaultTone: account.defaultTone ?? "",
          topicFocus: account.topicFocus ?? "",
          hookStyle: account.hookStyle ?? "",
          ctaStyle: account.ctaStyle ?? "",
          voiceGuardrails: account.voiceGuardrails ?? "",
          autoGenerateEnabled: account.autoGenerateEnabled ?? false,
          autoGenerateTime: account.autoGenerateTime ?? "09:00",
          autoGenerateMode: account.autoGenerateMode === "draft" ? "draft" : "scheduled",
          autoGeneratePrompt: account.autoGeneratePrompt ?? "",
          autoGenerateGoal: account.autoGenerateGoal ?? ""
        }))}
      />
    </div>
  );
}
