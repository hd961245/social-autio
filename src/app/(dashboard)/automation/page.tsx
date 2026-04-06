import { AutomationManager } from "@/components/dashboard/automation-manager";
import { PageIntro } from "@/components/dashboard/page-intro";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AutomationPage() {
  const cards = [
    { title: "Trigger", body: "keyword_match / mention / reply_received / new_follower" },
    { title: "Action", body: "reply / like / repost / quote" },
    { title: "Safety", body: "每日上限、隨機延遲、重複偵測、全域暫停" }
  ];
  const [rules, accounts] = await Promise.all([
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
    })
  ]);

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Automation"
        title="自動化規則"
        description="這一頁先把規則模型與操作方式可視化，等 engine 接上後就能把 keyword 命中直接轉成回應工作。"
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
          actionConfig: rule.actionConfig
        }))}
        accounts={accounts.map((account) => ({
          id: account.id,
          username: `@${account.platformUsername}`,
          platform: account.platform
        }))}
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
            <ul className="mt-4 space-y-3 text-sm leading-7 text-white/78">
              <li>規則資料表與 engine interface 已經存在。</li>
              <li>下一步接 keyword scan 後即可把命中推進規則判斷。</li>
              <li>AI reply 模式會在後面掛上 Anthropic key 檢查與預覽。</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
