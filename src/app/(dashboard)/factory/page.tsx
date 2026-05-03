import Link from "next/link";

import { ContentEngineForm } from "@/components/dashboard/content-engine-form";
import { HelpSheet } from "@/components/dashboard/help-sheet";
import { PageIntro } from "@/components/dashboard/page-intro";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function getRecentWindowStart(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

export default async function FactoryPage() {
  let settings: Awaited<ReturnType<typeof prisma.appSettings.findFirst>> = null;
  let ingestions: Awaited<ReturnType<typeof prisma.ingestionRecord.findMany>> = [];
  let threadsAccounts: Awaited<ReturnType<typeof prisma.platformAccount.findMany>> = [];
  let automationLogs: Array<{
    id: string;
    actionType: string;
    status: string;
    postId: string | null;
    detail: string | null;
    executedAt: Date;
    account: {
      platformUsername: string;
    } | null;
  }> = [];
  let drafts: Array<
    Awaited<ReturnType<typeof prisma.post.findMany<{ include: { account: true } }>>>[number]
  > = [];

  try {
    [settings, ingestions, drafts, threadsAccounts, automationLogs] = await Promise.all([
      prisma.appSettings.findFirst(),
      prisma.ingestionRecord.findMany({
        orderBy: { createdAt: "desc" },
        take: 6
      }),
      prisma.post.findMany({
        where: { status: "draft" },
        include: { account: true },
        orderBy: { createdAt: "desc" },
        take: 8
      }),
      prisma.platformAccount.findMany({
        where: { platform: "threads", isActive: true },
        orderBy: [{ isActive: "desc" }, { createdAt: "asc" }]
      }),
      prisma.automationLog.findMany({
        where: {
          actionType: {
            in: ["daily_persona_generation", "optimization_flywheel", "auto_wordpress_expansion", "auto_promote_review_draft"]
          }
        },
        include: {
          account: {
            select: {
              platformUsername: true
            }
          }
        },
        orderBy: {
          executedAt: "desc"
        },
        take: 12
      })
    ]);
  } catch {}

  const fourteenDaysAgo = getRecentWindowStart(14);
  const recentFactoryRuns = automationLogs.filter((log) => log.executedAt >= fourteenDaysAgo);
  const autopilotRuns = recentFactoryRuns.filter((log) => log.actionType === "daily_persona_generation" && log.status !== "failed").length;
  const optimizationRuns = recentFactoryRuns.filter((log) => log.actionType === "optimization_flywheel" && log.status !== "failed").length;
  const wordpressRuns = recentFactoryRuns.filter((log) => log.actionType === "auto_wordpress_expansion" && log.status !== "failed").length;
  const promotedRuns = recentFactoryRuns.filter((log) => log.actionType === "auto_promote_review_draft" && log.status !== "failed").length;
  const recentFactoryFeed = automationLogs.slice(0, 6).map((log) => ({
    id: log.id,
    title:
      log.actionType === "daily_persona_generation"
        ? "AI 自動產文"
        : log.actionType === "optimization_flywheel"
          ? "14 天優化飛輪"
          : log.actionType === "auto_promote_review_draft"
            ? "高信心稿自動排程"
            : "WordPress 自動沉澱",
    accountLabel: log.account ? `@${log.account.platformUsername}` : "站台級任務",
    executedAt: log.executedAt.toLocaleString("zh-TW", { hour12: false }),
    detail: log.detail ?? "已完成背景任務",
    href:
      log.postId && log.actionType === "auto_wordpress_expansion"
        ? `/posts/${log.postId}`
        : log.postId
          ? `/review/${log.postId}`
          : "/review"
  }));

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Content Factory"
        title="AI 寫文工廠"
        description="這裡統一處理來源轉稿、YouTube / transcript ingestion、persona autopilot 前置素材，以及長文擴寫原料。Compose 只保留最後確認與送出。"
        action={
          <div className="flex flex-wrap gap-3">
            <HelpSheet topic="content-engine" buttonLabel="查看工廠說明" />
            <Link href="/compose" className="rounded-full border border-[var(--border)] bg-white/80 px-4 py-2 text-sm">
              直接去 Compose
            </Link>
          </div>
        }
      />

      <section className="grid gap-4 xl:grid-cols-3">
        {[
          { label: "來源轉稿", detail: "文章 / 新聞 / Threads / YouTube / transcript 先正規化，再拆成 Threads / WordPress 草稿。" },
          { label: "persona autopilot 原料", detail: "站台 mission、來源路徑、高可寫題目、留言洞察，都先在這裡變成 AI 可用上下文。" },
          { label: "長文擴寫供應鏈", detail: "把強表現 Threads、研究站長文、YouTube transcript 收成後續 WordPress 草稿素材。" }
        ].map((card) => (
          <article key={card.label} className="glass-panel rounded-[1.8rem] border border-[var(--border)] p-5">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">{card.label}</p>
            <p className="mt-3 text-sm leading-7 text-[var(--foreground)]">{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        {[
          { label: "14 天自動產文", value: String(autopilotRuns), detail: "persona autopilot 成功執行次數" },
          { label: "14 天自動排程", value: String(promotedRuns), detail: "高信心 Threads 候選稿自動升級進排程" },
          { label: "14 天優化飛輪", value: String(optimizationRuns), detail: "舊文觀察後自動生成的優化稿" },
          { label: "14 天沉長文", value: String(wordpressRuns), detail: "強表現 Threads 自動送進 WordPress" }
        ].map((card) => (
          <article key={card.label} className="metric-card">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold">{card.value}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">Factory Feed</p>
              <h2 className="mt-2 text-2xl font-semibold">系統最近自己做了哪些事</h2>
            </div>
            <Link href="/review" className="text-sm font-medium text-[var(--accent)]">
              去待拍板台
            </Link>
          </div>
        <div className="mt-5 grid gap-3 xl:grid-cols-2">
          {recentFactoryFeed.length ? (
            recentFactoryFeed.map((item) => (
              <article key={item.id} className="rounded-[1.4rem] border border-[var(--border)] bg-white/82 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{item.title}</p>
                  <span className="pill-tag">{item.executedAt}</span>
                </div>
                <p className="mt-3 text-sm font-medium text-[var(--foreground)]">{item.accountLabel}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">{item.detail}</p>
                <div className="mt-4">
                  <a href={item.href} className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium">
                    去看結果
                  </a>
                </div>
              </article>
            ))
          ) : (
            <p className="rounded-[1.4rem] border border-dashed border-[var(--border)] px-4 py-5 text-sm text-[var(--muted)]">
              工廠最近還沒有新的背景任務紀錄。等 autopilot、優化飛輪與長文飛輪開始持續運轉後，這裡會直接像營運 feed 一樣顯示。
            </p>
          )}
        </div>
      </section>

      <ContentEngineForm
        initialPersonaPrompt={settings?.globalPersonaPrompt ?? "像一位冷靜但有觀點的內容策略師，幫我把素材整理成可發佈版本。"}
        initialTone={settings?.defaultTone ?? "sharp-observer"}
        initialAiProvider={(settings?.aiProvider as "auto" | "gemini" | "claude" | "openai" | undefined) ?? "auto"}
        threadsAccounts={threadsAccounts.map((account) => ({
          id: account.id,
          username: `@${account.platformUsername}`,
          personaLabel: account.personaLabel ?? "",
          personaPrompt: account.personaPrompt ?? "",
          defaultTone: account.defaultTone ?? "",
          topicFocus: account.topicFocus ?? "",
          hookStyle: account.hookStyle ?? "",
          ctaStyle: account.ctaStyle ?? "",
          voiceGuardrails: account.voiceGuardrails ?? ""
        }))}
        recentIngestions={ingestions.map((item) => ({
          id: item.id,
          sourceType: item.sourceType,
          title: item.title ?? "未命名素材",
          createdAt: item.createdAt.toLocaleString("zh-TW", { hour12: false }),
          generatedCount: item.generatedPostIds ? (JSON.parse(item.generatedPostIds) as string[]).length : 0
        }))}
        recentDrafts={drafts.map((draft) => ({
          id: draft.id,
          platform: draft.account.platform,
          title: draft.title ?? draft.textContent ?? "未命名草稿",
          status: draft.status,
          href: draft.account.platform === "threads" ? `/review/${draft.id}` : `/compose?postId=${draft.id}`
        }))}
      />
    </div>
  );
}
