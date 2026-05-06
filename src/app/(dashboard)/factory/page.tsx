import Link from "next/link";

import { ContentEngineForm } from "@/components/dashboard/content-engine-form";
import { HelpSheet } from "@/components/dashboard/help-sheet";
import { PageIntro } from "@/components/dashboard/page-intro";
import { SeoOpportunityDraftButton } from "@/components/dashboard/seo-opportunity-draft-button";
import { getPortfolioOperatingSnapshot } from "@/lib/dashboard-data";
import { getGscOpportunityQueue } from "@/lib/gsc";
import { getOpsDiagnostics } from "@/lib/ops-diagnostics";
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
  let gscOpportunities: Awaited<ReturnType<typeof getGscOpportunityQueue>> = {
    configured: false,
    items: [],
    message: "目前還讀不到 Search Console 機會隊列。"
  };
  const portfolio = await getPortfolioOperatingSnapshot().catch(() => null);
  const diagnostics = await getOpsDiagnostics().catch(() => null);

  try {
    [settings, ingestions, drafts, threadsAccounts, automationLogs, gscOpportunities] = await Promise.all([
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
      }),
      getGscOpportunityQueue()
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
  const autoHandledItems = recentFactoryFeed.filter((item) =>
    ["高信心稿自動排程", "WordPress 自動沉澱"].includes(item.title)
  );
  const interventionItems = recentFactoryFeed.filter((item) =>
    ["AI 自動產文", "14 天優化飛輪"].includes(item.title)
  );
  const failedItems = automationLogs
    .filter((log) => log.status === "failed")
    .slice(0, 6)
    .map((log) => ({
      id: log.id,
      title:
        log.actionType === "daily_persona_generation"
          ? "自動產文失敗"
          : log.actionType === "optimization_flywheel"
            ? "優化飛輪失敗"
            : log.actionType === "auto_promote_review_draft"
              ? "自動排程失敗"
              : "長文沉澱失敗",
      accountLabel: log.account ? `@${log.account.platformUsername}` : "站台級任務",
      executedAt: log.executedAt.toLocaleString("zh-TW", { hour12: false }),
      detail: log.detail ?? "背景任務失敗",
      href: log.postId ? `/review/${log.postId}` : "/ops"
    }));
  const interventionCount = drafts.filter((draft) => draft.account.platform === "threads" && draft.status === "draft").length;
  const accountFactoryRollups = Array.from(
    recentFactoryFeed.reduce(
      (map, item) => {
        const current = map.get(item.accountLabel) ?? {
          accountLabel: item.accountLabel,
          autoHandled: 0,
          intervention: 0,
          failed: 0
        };

        if (["高信心稿自動排程", "WordPress 自動沉澱"].includes(item.title)) {
          current.autoHandled += 1;
        } else {
          current.intervention += 1;
        }

        map.set(item.accountLabel, current);
        return map;
      },
      new Map<
        string,
        {
          accountLabel: string;
          autoHandled: number;
          intervention: number;
          failed: number;
        }
      >()
    ).values()
  );

  for (const failed of failedItems) {
    const existing = accountFactoryRollups.find((item) => item.accountLabel === failed.accountLabel);
    if (existing) {
      existing.failed += 1;
    } else {
      accountFactoryRollups.push({
        accountLabel: failed.accountLabel,
        autoHandled: 0,
        intervention: 0,
        failed: 1
      });
    }
  }

  accountFactoryRollups.sort((left, right) => {
    const leftScore = left.failed * 4 + left.intervention * 2 + left.autoHandled;
    const rightScore = right.failed * 4 + right.intervention * 2 + right.autoHandled;
    return rightScore - leftScore;
  });

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Content Factory"
        title="背景工廠層只管系統自己做了什麼"
        description="Factory 不承接日常決策。它只回答三件事：系統最近替哪些帳號做了什麼、哪些稿件還在等你補最後一刀、哪些背景任務真的壞掉了。"
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
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">Reliability Rail</p>
            <h2 className="mt-2 text-2xl font-semibold">工廠層先看哪些底層訊號會讓飛輪斷掉</h2>
          </div>
          <Link href="/ops" className="text-sm font-medium text-[var(--accent)]">
            去 Ops
          </Link>
        </div>
        <div className="mt-5 grid gap-3 xl:grid-cols-4">
          {[
            {
              label: "24h 失敗任務",
              value: String(portfolio?.failedRuns24h ?? 0),
              detail: (portfolio?.failedRuns24h ?? 0) > 0 ? "這代表背景工廠今天有斷點要補。" : "今天目前沒有新的背景失敗。"
            },
            {
              label: "Schema",
              value: diagnostics?.schema.looksDrifted ? "Drifted" : "Aligned",
              detail: diagnostics?.schema.detail ?? "尚未讀到 schema 狀態"
            },
            {
              label: "AI Health",
              value: diagnostics?.aiHealth.gemini.ok ? "Ready" : "Fallback",
              detail: diagnostics?.aiHealth.gemini.message ?? "尚未讀到 AI 健康狀態"
            },
            {
              label: "Auto Coverage",
              value: String(portfolio?.accountsNeedingCoverage ?? 0),
              detail:
                (portfolio?.accountsNeedingCoverage ?? 0) > 0
                  ? "還有帳號今天沒滿一篇，工廠會優先補稿。"
                  : "目前所有啟用中的帳號都已有今日覆蓋。"
            }
          ].map((card) => (
            <article key={card.label} className="rounded-[1.25rem] border border-[var(--border)] bg-white/82 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{card.label}</p>
              <p className="mt-3 text-2xl font-semibold">{card.value}</p>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{card.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">By Account</p>
            <h2 className="mt-2 text-2xl font-semibold">每條營運線最近的工廠狀態</h2>
          </div>
          <Link href="/accounts" className="text-sm font-medium text-[var(--accent)]">
            去帳號總覽
          </Link>
        </div>
        <div className="mt-5 grid gap-3 xl:grid-cols-2">
          {accountFactoryRollups.length ? (
            accountFactoryRollups.slice(0, 6).map((item) => (
              <article key={item.accountLabel} className="rounded-[1.35rem] border border-[var(--border)] bg-white/82 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold">{item.accountLabel}</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="pill-tag">已處理 {item.autoHandled}</span>
                    <span className="pill-tag">待介入 {item.intervention}</span>
                    <span className="pill-tag">失敗 {item.failed}</span>
                  </div>
                </div>
                <p className="mt-3 break-words text-sm leading-7 text-[var(--muted)]">
                  {item.failed
                    ? "這條線有背景失敗，應優先檢查 token、來源或自動發布問題。"
                    : item.intervention
                      ? "這條線有中信心內容或優化稿，系統先留給你最後拍板。"
                      : "這條線最近大多能自己完成排程、長文沉澱或 SEO 處理。 "}
                </p>
              </article>
            ))
          ) : (
            <p className="rounded-[1.35rem] border border-dashed border-[var(--border)] px-4 py-5 text-sm text-[var(--muted)] xl:col-span-2">
              目前還沒有足夠的工廠事件可彙總。等 autopilot 連續跑幾輪後，這裡會更像每帳號的背景作業條。
            </p>
          )}
        </div>
      </section>

      <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">SEO Input Queue</p>
              <h2 className="mt-2 text-2xl font-semibold">Search Console 開始成為工廠輸入層</h2>
            </div>
          <Link href="/analytics" className="text-sm font-medium text-[var(--accent)]">
            看搜尋層
          </Link>
        </div>
        <div className="mt-5 grid gap-3 xl:grid-cols-3">
          {gscOpportunities.items.length ? (
            gscOpportunities.items.slice(0, 3).map((item) => (
              <article key={item.id} className="rounded-[1.35rem] border border-[var(--border)] bg-white/82 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{item.label}</p>
                  <span className="pill-tag">{item.confidence === "high" ? "高信心" : item.confidence === "medium" ? "中信心" : "觀察中"}</span>
                </div>
                <p className="mt-3 text-sm font-medium leading-7">{item.query ?? item.page}</p>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{item.reason}</p>
                <p className="mt-3 text-sm text-[var(--accent-strong)]">{item.action}</p>
                <p className="mt-3 text-sm text-[var(--muted)]">
                  {item.confidence === "high"
                    ? "這筆會優先進系統自動處理層，WordPress 自動模式開著時可直接被發布。"
                    : item.confidence === "medium"
                      ? "這筆會先轉成 WordPress 優化稿，讓你在 Review 最後拍板。"
                      : "這筆先留在觀察池，等自然搜尋訊號更明顯再啟動。"}
                </p>
                <div className="mt-4">
                  <SeoOpportunityDraftButton
                    page={item.page}
                    query={item.query}
                    lane={item.lane}
                    confidence={item.confidence}
                    reason={item.reason}
                    action={item.action}
                  />
                </div>
              </article>
            ))
          ) : (
            <p className="rounded-[1.35rem] border border-dashed border-[var(--border)] px-4 py-5 text-sm text-[var(--muted)] xl:col-span-3">
              {gscOpportunities.message}
            </p>
          )}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <article className="glass-panel rounded-[2rem] border border-[var(--border)] p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">Auto-Handled</p>
              <h2 className="mt-2 text-2xl font-semibold">系統已自行處理</h2>
            </div>
            <span className="pill-tag">{autoHandledItems.length} 筆</span>
          </div>
          <div className="mt-5 max-h-[22rem] space-y-3 overflow-y-auto pr-1">
            {autoHandledItems.length ? (
              autoHandledItems.map((item) => (
                <article key={item.id} className="rounded-[1.35rem] border border-[var(--border)] bg-white/82 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{item.title}</p>
                    <span className="pill-tag">{item.executedAt}</span>
                  </div>
                  <p className="mt-3 text-sm font-medium">{item.accountLabel}</p>
                  <p className="mt-2 break-words text-sm leading-7 text-[var(--muted)]">{item.detail}</p>
                  <div className="mt-4">
                    <Link href={item.href} className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium">
                      看結果
                    </Link>
                  </div>
                </article>
              ))
            ) : (
              <p className="rounded-[1.35rem] border border-dashed border-[var(--border)] px-4 py-5 text-sm text-[var(--muted)]">
                目前還沒有明顯的自動完成紀錄。等高信心稿自己排程、強文自己沉長文後，這裡會先顯示。
              </p>
            )}
          </div>
        </article>

        <article className="glass-panel rounded-[2rem] border border-[var(--border)] p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">Needs Intervention</p>
              <h2 className="mt-2 text-2xl font-semibold">等待你介入</h2>
            </div>
            <span className="pill-tag">{Math.max(interventionItems.length, interventionCount)} 筆</span>
          </div>
          <div className="mt-5 max-h-[22rem] space-y-3 overflow-y-auto pr-1">
            {interventionItems.length ? (
              interventionItems.map((item) => (
                <article key={item.id} className="rounded-[1.35rem] border border-[var(--border)] bg-white/82 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{item.title}</p>
                    <span className="pill-tag">{item.executedAt}</span>
                  </div>
                  <p className="mt-3 text-sm font-medium">{item.accountLabel}</p>
                  <p className="mt-2 break-words text-sm leading-7 text-[var(--muted)]">{item.detail}</p>
                  <div className="mt-4">
                    <Link href={item.href} className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium">
                      去拍板
                    </Link>
                  </div>
                </article>
              ))
            ) : (
              <p className="rounded-[1.35rem] border border-dashed border-[var(--border)] px-4 py-5 text-sm text-[var(--muted)]">
                目前沒有新的待拍板工廠稿。系統最近產出的內容大多已自己處理或自己排程。
              </p>
            )}
          </div>
        </article>

        <article className="glass-panel rounded-[2rem] border border-[var(--border)] p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">Failed / Repair</p>
              <h2 className="mt-2 text-2xl font-semibold">失敗待修復</h2>
            </div>
            <span className="pill-tag">{failedItems.length} 筆</span>
          </div>
          <div className="mt-5 max-h-[22rem] space-y-3 overflow-y-auto pr-1">
            {failedItems.length ? (
              failedItems.map((item) => (
                <article key={item.id} className="rounded-[1.35rem] border border-rose-200 bg-rose-50/70 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-rose-700">{item.title}</p>
                    <span className="rounded-full bg-white px-3 py-1 text-xs text-rose-700">{item.executedAt}</span>
                  </div>
                  <p className="mt-3 text-sm font-medium">{item.accountLabel}</p>
                  <p className="mt-2 break-all text-sm leading-7 text-[var(--muted)]">{item.detail}</p>
                  <div className="mt-4">
                    <Link href={item.href} className="rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700">
                      去處理
                    </Link>
                  </div>
                </article>
              ))
            ) : (
              <p className="rounded-[1.35rem] border border-dashed border-[var(--border)] px-4 py-5 text-sm text-[var(--muted)]">
                目前沒有新的背景失敗紀錄。這代表自動寫文、優化與長文沉澱最近都在正常運轉。
              </p>
            )}
          </div>
        </article>
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
                  <Link href={item.href} className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium">
                    去看結果
                  </Link>
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
