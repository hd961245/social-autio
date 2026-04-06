import { AutomationManager } from "@/components/dashboard/automation-manager";
import { PageIntro } from "@/components/dashboard/page-intro";
import { getAutomationLogSummaries } from "@/lib/dashboard-data";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AutomationPage() {
  const cards = [
    { title: "Trigger", body: "keyword_match / mention / reply_received / new_follower" },
    { title: "Action", body: "reply / like / repost / quote" },
    { title: "Safety", body: "每日上限、隨機延遲、重複偵測、全域暫停" }
  ];
  let rules: Awaited<ReturnType<typeof prisma.autoRule.findMany>> = [];
  let accounts: Awaited<ReturnType<typeof prisma.platformAccount.findMany>> = [];
  let settings: Awaited<ReturnType<typeof prisma.appSettings.findFirst>> = null;
  let logs = await getAutomationLogSummaries();

  try {
    [rules, accounts, settings] = await Promise.all([
      prisma.autoRule.findMany({
        orderBy: {
          createdAt: "desc"
        }
      }),
      prisma.platformAccount.findMany({
        where: {
          isActive: true
        },
        orderBy: {
          createdAt: "desc"
        }
      }),
      prisma.appSettings.findFirst()
    ]);
  } catch {
    logs = [];
  }

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Automation"
        title="自動化規則"
        description="規則引擎現在會把 keyword 命中轉成延遲回覆佇列，並記錄活動日誌、每日上限與全域暫停狀態。"
      />
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <article key={card.title} className="glass-panel rounded-[1.75rem] border border-[var(--border)] p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">{card.title}</p>
            <p className="mt-3 text-base leading-7">{card.body}</p>
          </article>
        ))}
      </div>
      <AutomationManager
        initialRules={rules.map((rule) => ({
          id: rule.id,
          name: rule.name,
          isActive: rule.isActive,
          dailyLimit: rule.dailyLimit,
          triggerConfig: rule.triggerConfig,
          actionConfig: rule.actionConfig,
          delayMinSeconds: rule.delayMinSeconds,
          delayMaxSeconds: rule.delayMaxSeconds
        }))}
        accounts={accounts.map((account) => ({
          id: account.id,
          username: `@${account.platformUsername}`,
          platform: account.platform
        }))}
        initialSettings={{
          automationPaused: settings?.automationPaused ?? false,
          keywordScanPaused: settings?.keywordScanPaused ?? false
        }}
      />
      <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Rule Draft</p>
            <h2 className="mt-2 text-3xl font-semibold">Keyword hit to reply workflow</h2>
            <div className="mt-6 space-y-3 text-sm">
              <div className="rounded-[1.4rem] border border-[var(--border)] bg-white/70 p-4">
                Trigger: 關鍵字命中 `social audio`
              </div>
              <div className="rounded-[1.4rem] border border-[var(--border)] bg-white/70 p-4">
                Action: 使用 `@demo_threads` 送出 template reply
              </div>
              <div className="rounded-[1.4rem] border border-[var(--border)] bg-white/70 p-4">
                Guardrails: 每日 50 次、延遲 30-300 秒、同貼文只跑一次
              </div>
            </div>
          </div>
          <div className="rounded-[1.8rem] bg-[var(--card-dark)] p-5 text-white">
            <p className="text-[11px] uppercase tracking-[0.25em] text-white/55">Execution Notes</p>
            <div className="mt-4 space-y-3 text-sm leading-7 text-white/78">
              {logs.map((log) => (
                <div key={log.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/50">
                    {log.ruleName} · {log.status}
                  </p>
                  <p className="mt-2">{log.detail}</p>
                  <p className="mt-2 text-xs text-white/50">{log.executedAt}</p>
                </div>
              ))}
              {logs.length === 0 ? <p>目前還沒有自動化活動日誌，先跑一次規則就會出現在這裡。</p> : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
