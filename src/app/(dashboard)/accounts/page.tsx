import { AccountCardItem } from "@/components/dashboard/account-card";
import { AccountPersonaManager } from "@/components/dashboard/account-persona-manager";
import { PageIntro } from "@/components/dashboard/page-intro";
import { prisma } from "@/lib/prisma";
import { getAccountSummaries } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const displayAccounts = await getAccountSummaries();
  const [rawAccounts, autopilotLogs] = await Promise.all([
    prisma.platformAccount.findMany({
      where: { isActive: true },
      orderBy: [{ platform: "asc" }, { createdAt: "desc" }]
    }).catch(() => []),
    prisma.automationLog.findMany({
      where: {
        actionType: "daily_persona_generation"
      },
      include: {
        account: true
      },
      orderBy: {
        executedAt: "desc"
      },
      take: 8
    }).catch(() => [])
  ]);
  const latestAutopilotLogByAccount = new Map(
    autopilotLogs
      .filter((log) => log.accountId)
      .map((log) => [log.accountId as string, log] as const)
  );

  const enabledAutopilotCount = rawAccounts.filter(
    (account) => account.platform === "threads" && account.autoGenerateEnabled
  ).length;

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Accounts"
        title="已連接帳號"
        description="查看 Threads 授權狀態、同步時間與目前可用帳號。每支 Threads 帳號也可以在這裡設定自己的人設，並啟用每天自動產文後直接存草稿或排進發布隊列。"
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

      <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">AI Autopilot</p>
            <h2 className="mt-2 text-3xl font-semibold">先產文，再自動存草稿或加入排程</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
              這條線現在已經是可用的第一版。你在下方打開「每日自動生文」後，系統會依照該帳號的人設、題材範圍、每日方向與目標，自己生成一篇 Threads 內容。
              如果模式選 `draft`，會先存草稿；如果模式選 `scheduled`，會自動排進發布佇列，之後交給 scheduler 發出去。
            </p>
          </div>
          <div className="rounded-[1.4rem] border border-[var(--border)] bg-white/80 px-5 py-4">
            <p className="text-sm text-[var(--muted)]">目前已啟用</p>
            <p className="mt-2 text-3xl font-semibold">{enabledAutopilotCount}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">個 Threads persona 自動生文</p>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-[1.6rem] border border-[var(--border)] bg-white/75">
          <div className="grid grid-cols-[180px_1fr_120px] gap-4 border-b border-[var(--border)] px-4 py-3 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
            <p>時間 / 帳號</p>
            <p>結果</p>
            <p>狀態</p>
          </div>
          {autopilotLogs.length === 0 ? (
            <div className="px-4 py-4 text-sm text-[var(--muted)]">目前還沒有 AI 自動生文紀錄。先在下方開啟一個 persona 試跑即可。</div>
          ) : (
            autopilotLogs.map((log) => (
              <div key={log.id} className="grid grid-cols-[180px_1fr_120px] gap-4 border-b border-[var(--border)] px-4 py-4 text-sm last:border-b-0">
                <div>
                  <p className="font-medium">{log.account ? `@${log.account.platformUsername}` : "未知帳號"}</p>
                  <p className="mt-1 text-[var(--muted)]">
                    {log.executedAt.toLocaleString("zh-TW", { hour12: false })}
                  </p>
                </div>
                <p className="text-[var(--foreground)]">{log.detail ?? "已記錄 AI 自動生文結果"}</p>
                <p
                  className={`font-medium uppercase ${
                    log.status === "failed"
                      ? "text-[var(--danger)]"
                      : log.status === "scheduled"
                        ? "text-[var(--warning)]"
                        : "text-[var(--success)]"
                  }`}
                >
                  {log.status}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

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
          autoGenerateGoal: account.autoGenerateGoal ?? "",
          lastAutopilotStatus: latestAutopilotLogByAccount.get(account.id)?.status,
          lastAutopilotDetail: latestAutopilotLogByAccount.get(account.id)?.detail ?? "",
          lastAutopilotAt: latestAutopilotLogByAccount.get(account.id)?.executedAt.toLocaleString("zh-TW", {
            hour12: false
          }) ?? ""
        }))}
      />
    </div>
  );
}
