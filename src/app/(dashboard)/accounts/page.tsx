import Link from "next/link";

import { AccountCardItem } from "@/components/dashboard/account-card";
import { AutopilotHeartbeat } from "@/components/dashboard/autopilot-heartbeat";
import { AccountPersonaManager } from "@/components/dashboard/account-persona-manager";
import { AutopilotEditorialControl } from "@/components/dashboard/autopilot-editorial-control";
import { PageIntro } from "@/components/dashboard/page-intro";
import { buildAutopilotLearningGuide } from "@/lib/automation/autopilot-learning";
import { getEffectiveAutopilotMode, isAutopilotEnabledForAccount } from "@/lib/automation/account-autopilot";
import { inferBestScheduleTime } from "@/lib/automation/autopilot-timing";
import { prisma } from "@/lib/prisma";
import { getAccountOperatingSummaries } from "@/lib/dashboard-data";

export const revalidate = 120;

function getMetricScore(metric?: {
  views: number;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
  shares: number;
} | null) {
  if (!metric) {
    return 0;
  }

  return (
    metric.views +
    metric.likes * 12 +
    metric.replies * 18 +
    metric.reposts * 22 +
    metric.quotes * 18 +
    metric.shares * 20
  );
}

function buildHourlyBars(
  posts: Array<{
    publishedAt: Date | null;
    metrics: Array<{
      views: number;
      likes: number;
      replies: number;
      reposts: number;
      quotes: number;
      shares: number;
    }>;
  }>
) {
  const buckets = new Map<number, { hour: number; score: number; count: number }>();

  for (const post of posts) {
    if (!post.publishedAt) {
      continue;
    }

    const metric = post.metrics[0];
    const score = getMetricScore(metric);
    const hour = post.publishedAt.getHours();
    const current = buckets.get(hour) ?? { hour, score: 0, count: 0 };
    current.score += score;
    current.count += 1;
    buckets.set(hour, current);
  }

  return [...buckets.values()]
    .sort((left, right) => right.score / Math.max(right.count, 1) - left.score / Math.max(left.count, 1))
    .slice(0, 5)
    .map((bucket) => ({
      label: `${String(bucket.hour).padStart(2, "0")}:00`,
      value: Math.round(bucket.score / Math.max(bucket.count, 1))
    }));
}

export default async function AccountsPage() {
  const displayAccounts = await getAccountOperatingSummaries();
  const [rawAccounts, autopilotLogs, settings] = await Promise.all([
    prisma.platformAccount.findMany({
      where: { isActive: true, platform: "threads" },
      orderBy: [{ platform: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        platform: true,
        platformUsername: true,
        personaLabel: true,
        personaPrompt: true,
        defaultTone: true,
        topicFocus: true,
        hookStyle: true,
        ctaStyle: true,
        voiceGuardrails: true,
        autoGenerateTime: true,
        autoGenerateEnabled: true,
        autoGenerateMode: true,
        autoGeneratePrompt: true,
        autoGenerateGoal: true,
        tokenExpiresAt: true,
        posts: {
          where: {
            status: "published",
            publishedAt: {
              not: null
            }
          },
          orderBy: {
            publishedAt: "desc"
          },
          take: 12,
          include: {
            metrics: {
              orderBy: {
                capturedAt: "desc"
              },
              take: 1
            }
          }
        }
      }
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
    }).catch(() => []),
    prisma.appSettings.findFirst().catch(() => null)
  ]);
  const autopilotLogCountByAccount = new Map<string, number>();
  for (const log of autopilotLogs) {
    if (!log.accountId) {
      continue;
    }
    autopilotLogCountByAccount.set(log.accountId, (autopilotLogCountByAccount.get(log.accountId) ?? 0) + 1);
  }
  const latestAutopilotLogByAccount = new Map(
    autopilotLogs
      .filter((log) => log.accountId)
      .map((log) => [log.accountId as string, log] as const)
  );
  const siteAutopilotMode =
    settings?.autopilotMode === "review_only" || settings?.autopilotMode === "auto_schedule"
      ? settings.autopilotMode
      : "near_full_auto";

  const enabledAutopilotCount = rawAccounts.filter(
    (account) => account.platform === "threads" && isAutopilotEnabledForAccount(account, siteAutopilotMode)
  ).length;
  const todayPublished = displayAccounts.reduce((sum, account) => sum + account.todayPublishedCount, 0);
  const todayScheduled = displayAccounts.reduce((sum, account) => sum + account.todayScheduledCount, 0);
  const accountsNeedingDailyCoverage = displayAccounts.filter((account) => account.needsDailyPost).length;
  const totalExceptions = displayAccounts.reduce((sum, account) => sum + account.exceptionCount, 0);
  const totalWpExpansion = displayAccounts.reduce((sum, account) => sum + account.wordpressExpansionCount, 0);

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Accounts"
        title="每個帳號都是一條獨立營運線"
        description="先看各帳號今天有沒有自己跑起來、來源偏好、長文沉澱與例外，再決定要不要介入。下面的設定區只在你要改方向或保險絲時才需要打開。"
        action={
          <Link href="/accounts/connect" className="rounded-full bg-[var(--accent)] px-4 py-3 text-sm text-white">
            連接 Threads 帳號
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "啟用中的營運線", value: String(displayAccounts.length), detail: "目前有在跑的 Threads 帳號" },
          { label: "今日已發 Threads", value: String(todayPublished), detail: "已真正送出的內容數" },
          { label: "今日已排程", value: String(todayScheduled), detail: "高自動內容已進排程佇列" },
          { label: "今天還缺一篇", value: String(accountsNeedingDailyCoverage), detail: "系統今天會優先補的帳號數" },
          { label: "長文待放大", value: String(totalWpExpansion), detail: "可自動沉到 WordPress 的強內容" }
        ].map((card) => (
          <article key={card.label} className="metric-card">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold">{card.value}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Account Portfolio</p>
              <h2 className="mt-2 text-3xl font-semibold">先看每條線今天有沒有順利自己運轉</h2>
            </div>
            <Link href="/review" className="text-sm font-medium text-[var(--accent)]">
              去看例外
            </Link>
          </div>
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {displayAccounts.map((account) => (
              <AccountCardItem key={account.id} account={account} />
            ))}
            {displayAccounts.length === 0 ? (
              <article className="glass-panel rounded-[1.75rem] border border-dashed border-[var(--border)] p-5 text-sm text-[var(--muted)]">
                尚未有帳號資料。先按右上角的「連接 Threads 帳號」完成第一支帳號授權。
              </article>
            ) : null}
          </div>
        </article>

        <article className="rounded-[2rem] bg-[var(--card-dark)] p-6 text-white shadow-[0_24px_60px_rgba(15,10,7,0.22)]">
          <p className="text-[11px] uppercase tracking-[0.3em] text-white/55">Operating Rule</p>
          <h2 className="mt-2 text-3xl font-semibold">高自動帳號的工作方式</h2>
          <div className="mt-5 space-y-3 text-sm text-white/78">
            <p className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3">
              每個啟用中的帳號，系統都會優先確保「今天至少一篇 Threads」。
            </p>
            <p className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3">
              Threads 高信心稿會自己排程；中低信心內容才送進 Review，不讓整體飛輪卡住。
            </p>
            <p className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3">
              強表現 Threads、SEO 高機會頁與長文型題目，會優先沉到 WordPress lane，形成第二條增長曲線。
            </p>
            <p className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3">
              你真正要看的，只剩例外、方向偏差與商業轉化機會。現在總例外數：{totalExceptions}。
            </p>
          </div>
        </article>
      </section>

      <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Site Control</p>
            <h2 className="mt-2 text-3xl font-semibold">站台級 mission 與自動化保險絲</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
              這裡只做整站方向設定：總 mission、WordPress 發佈策略、全站 autopilot mode 與 pause 開關。平常日常營運請先看上面的帳號營運線。
            </p>
          </div>
          <div className="rounded-[1.4rem] border border-[var(--border)] bg-white/80 px-5 py-4">
            <p className="text-sm text-[var(--muted)]">目前已啟用</p>
            <p className="mt-2 text-3xl font-semibold">{enabledAutopilotCount}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">個 Threads persona 自動生文</p>
          </div>
        </div>

        <div className="mt-6">
          <AutopilotEditorialControl
            initialDirection={settings?.editorialDirection ?? ""}
            initialGoal={settings?.editorialGoal ?? ""}
            initialMissionTitle={settings?.missionTitle ?? "7 個月內，讓接入帳號進入台灣前 50 大理財內容流量級"}
            initialMissionCurrentValue={settings?.missionCurrentValue ?? 0}
            initialMissionTargetValue={settings?.missionTargetValue ?? 30000}
            initialMissionUnit={settings?.missionUnit ?? "月自然流量"}
            initialMissionDeadline={settings?.missionDeadline?.toISOString() ?? null}
            initialAutopilotMode={
              (settings?.autopilotMode as "review_only" | "auto_schedule" | "near_full_auto" | undefined) ?? "near_full_auto"
            }
            initialWordPressPublishMode={
              (settings?.wordpressPublishMode as "draft_only" | "auto_publish" | undefined) ?? "draft_only"
            }
            initialAutomationPaused={settings?.automationPaused ?? false}
          />
        </div>
        <div className="mt-4">
          <AutopilotHeartbeat />
        </div>
      </section>

      <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Automation Feed</p>
            <h2 className="mt-2 text-3xl font-semibold">最近系統自己在各帳號做了什麼</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
              這裡只用來確認背景飛輪是否有正常跑，不是給你逐篇操作的地方。
            </p>
          </div>
          <Link href="/factory" className="rounded-full border border-[var(--border)] bg-white/80 px-4 py-2 text-sm">
            去 Factory
          </Link>
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
          ...(() => {
            const timing = inferBestScheduleTime({
              goal: account.autoGenerateGoal,
              posts: account.posts.map((post) => ({
                publishedAt: post.publishedAt,
                metrics: post.metrics.map((metric) => ({
                  views: metric.views,
                  likes: metric.likes,
                  replies: metric.replies,
                  reposts: metric.reposts,
                  quotes: metric.quotes,
                  shares: metric.shares
                }))
              }))
            });

            return {
              recommendedScheduleLabel: timing.label,
              recommendedScheduleDetail: timing.detail
            };
          })(),
          ...(() => {
            const learnedGuide = buildAutopilotLearningGuide({
              posts: account.posts.map((post) => ({
                text: post.textContent,
                title: post.title,
                metrics: post.metrics[0]
                  ? {
                      views: post.metrics[0].views,
                      likes: post.metrics[0].likes,
                      replies: post.metrics[0].replies,
                      reposts: post.metrics[0].reposts,
                      quotes: post.metrics[0].quotes,
                      shares: post.metrics[0].shares
                    }
                  : null
              })),
              topicFocus: account.topicFocus,
              personaLabel: account.personaLabel ?? account.platformUsername
            });

            return {
              learnedFocus: learnedGuide.focus,
              learnedHook: learnedGuide.hook,
              learnedCta: learnedGuide.cta,
              learnedReason: learnedGuide.reason,
              learnedNextMove: learnedGuide.nextMove
            };
          })(),
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
          autoGenerateTime: account.autoGenerateTime ?? "09:00",
          autoGenerateEnabled: isAutopilotEnabledForAccount(account, siteAutopilotMode),
          autoGenerateMode: getEffectiveAutopilotMode(account),
          autoGeneratePrompt: account.autoGeneratePrompt ?? "",
          autoGenerateGoal: account.autoGenerateGoal ?? "",
          lastAutopilotStatus: latestAutopilotLogByAccount.get(account.id)?.status,
          lastAutopilotDetail: latestAutopilotLogByAccount.get(account.id)?.detail ?? "",
          lastAutopilotAt: latestAutopilotLogByAccount.get(account.id)?.executedAt.toLocaleString("zh-TW", {
            hour12: false
          }) ?? "",
          recentPublishedCount: account.posts.length,
          recentAverageScore:
            account.posts.length > 0
              ? Math.round(
                  account.posts.reduce((sum, post) => sum + getMetricScore(post.metrics[0]), 0) / Math.max(account.posts.length, 1)
                )
              : 0,
          autopilotRunCount: autopilotLogCountByAccount.get(account.id) ?? 0,
          hourlyBars: buildHourlyBars(account.posts)
        }))}
      />
    </div>
  );
}
