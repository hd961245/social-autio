import Link from "next/link";

import { PageIntro } from "@/components/dashboard/page-intro";
import { PostsList } from "@/components/dashboard/posts-list";
import { SeoOpportunityDraftButton } from "@/components/dashboard/seo-opportunity-draft-button";
import { SyncWordPressButton } from "@/components/dashboard/sync-wordpress-button";
import { getGscOpportunityQueue } from "@/lib/gsc";
import { summarizeMissionStrategy } from "@/lib/mission-scoring";
import { prisma } from "@/lib/prisma";
import { getPostSummaries, getWordPressExpansionCandidates } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function ReviewBoardPage() {
  const [posts, expansionCandidates, optimizationDrafts, expansionLogs, settings, failedLogs, gscOpportunities] = await Promise.all([
    getPostSummaries(),
    getWordPressExpansionCandidates(),
    prisma.post.findMany({
      where: {
        account: {
          platform: "threads"
        },
        status: {
          in: ["draft", "scheduled", "awaiting_approval", "approval_rejected"]
        },
        topicTag: {
          startsWith: "optimize:"
        }
      },
      include: {
        account: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 6
    }).catch(() => []),
    prisma.automationLog.findMany({
      where: {
        actionType: "auto_wordpress_expansion",
        status: {
          not: "failed"
        }
      },
      include: {
        account: true
      },
      orderBy: {
        executedAt: "desc"
      },
      take: 5
    }).catch(() => []),
    prisma.appSettings.findFirst().catch(() => null),
    prisma.automationLog.findMany({
      where: {
        status: "failed",
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
      take: 5
    }).catch(() => []),
    getGscOpportunityQueue().catch(() => ({
      configured: false,
      items: [],
      message: "目前還讀不到 Search Console 機會隊列。"
    }))
  ]);
  const missionStrategy = summarizeMissionStrategy({
    title: settings?.missionTitle,
    goal: settings?.editorialGoal,
    direction: settings?.editorialDirection,
    unit: settings?.missionUnit,
    currentValue: settings?.missionCurrentValue,
    targetValue: settings?.missionTargetValue
  });
  const pendingReviewPosts = posts.filter(
    (post) =>
      post.platform === "threads" &&
      ["draft", "awaiting_approval", "approval_rejected"].includes(post.status)
  );
  const directPosts = pendingReviewPosts.filter((post) => post.reviewLane === "direct");
  const reviewPosts = pendingReviewPosts.filter((post) => post.reviewLane !== "direct");
  const optimizationCandidates = optimizationDrafts.map((post) => ({
    id: post.id,
    title: post.title ?? post.textContent ?? "未命名優化稿",
    text: post.textContent ?? "",
    accountLabel: `@${post.account.platformUsername}`,
    statusLabel:
      post.status === "scheduled"
        ? "已自動排程"
        : post.status === "awaiting_approval"
          ? "待拍板"
          : "待確認",
    detail: post.excerpt ?? "14 天觀察後自動產出的優化稿。",
    href: `/review/${post.id}`
  }));
  const wordpressExpansionFeed = expansionLogs.map((log) => ({
    id: log.id,
    accountLabel: log.account ? `@${log.account.platformUsername}` : "未知帳號",
    detail: log.detail ?? "系統已自動擴寫強表現 Threads。",
    executedAt: log.executedAt.toLocaleString("zh-TW", { hour12: false }),
      href: log.postId ? `/posts/${log.postId}` : "/wordpress"
  }));
  const accountExceptionRows = new Map<
    string,
    {
      accountLabel: string;
      reviewCount: number;
      directCount: number;
      optimizationCount: number;
      failedCount: number;
      seoCount: number;
    }
  >();

  for (const post of reviewPosts) {
    const key = post.account;
    const current = accountExceptionRows.get(key) ?? {
      accountLabel: key,
      reviewCount: 0,
      directCount: 0,
      optimizationCount: 0,
      failedCount: 0,
      seoCount: 0
    };
    current.reviewCount += 1;
    accountExceptionRows.set(key, current);
  }

  for (const post of directPosts) {
    const key = post.account;
    const current = accountExceptionRows.get(key) ?? {
      accountLabel: key,
      reviewCount: 0,
      directCount: 0,
      optimizationCount: 0,
      failedCount: 0,
      seoCount: 0
    };
    current.directCount += 1;
    accountExceptionRows.set(key, current);
  }

  for (const draft of optimizationCandidates) {
    const key = draft.accountLabel;
    const current = accountExceptionRows.get(key) ?? {
      accountLabel: key,
      reviewCount: 0,
      directCount: 0,
      optimizationCount: 0,
      failedCount: 0,
      seoCount: 0
    };
    current.optimizationCount += 1;
    accountExceptionRows.set(key, current);
  }

  for (const log of failedLogs) {
    const key = log.account?.platformUsername ? `@${log.account.platformUsername}` : "站台級";
    const current = accountExceptionRows.get(key) ?? {
      accountLabel: key,
      reviewCount: 0,
      directCount: 0,
      optimizationCount: 0,
      failedCount: 0,
      seoCount: 0
    };
    current.failedCount += 1;
    accountExceptionRows.set(key, current);
  }

  if (gscOpportunities.items.length) {
    const current = accountExceptionRows.get("WordPress / SEO") ?? {
      accountLabel: "WordPress / SEO",
      reviewCount: 0,
      directCount: 0,
      optimizationCount: 0,
      failedCount: 0,
      seoCount: 0
    };
    current.seoCount += gscOpportunities.items.length;
    accountExceptionRows.set("WordPress / SEO", current);
  }

  const accountExceptions = Array.from(accountExceptionRows.values())
    .sort((left, right) => {
      const leftScore =
        left.reviewCount * 4 + left.failedCount * 5 + left.optimizationCount * 2 + left.seoCount * 3 + left.directCount;
      const rightScore =
        right.reviewCount * 4 + right.failedCount * 5 + right.optimizationCount * 2 + right.seoCount * 3 + right.directCount;
      return rightScore - leftScore;
    })
    .slice(0, 6);
  const interventionCards = [
    reviewPosts.length > 0
      ? {
          label: `待拍板 ${reviewPosts.length}`,
          detail: "這些稿件是系統還不想自己定案的內容，你只要處理這些例外。",
          href: "#review-queue",
          action: "看待拍板"
        }
      : null,
    directPosts.length > 0
      ? {
          label: `可直接最後確認 ${directPosts.length}`,
          detail: "這批是高信心稿，你只要最後掃一眼就能讓系統繼續跑。",
          href: "#review-queue",
          action: "看高信心稿"
        }
      : null,
    failedLogs.length > 0
      ? {
          label: `背景失敗 ${failedLogs.length}`,
          detail: "有背景任務失敗，這會讓自動飛輪斷掉，是最該優先處理的例外。",
          href: "/factory",
          action: "去工廠紀錄"
        }
      : null,
    gscOpportunities.items.length > 0
      ? {
          label: `SEO 機會 ${gscOpportunities.items.length}`,
          detail: "Search Console 已經指出自然搜尋最值得補的頁面與查詢，這些是 WordPress 增長層最值得優先看的例外。",
          href: "#seo-opportunity-queue",
          action: "看 SEO 機會"
        }
      : null
  ].filter(Boolean) as Array<{ label: string; detail: string; href: string; action: string }>;

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Review"
        title="這裡只留真正需要你出手的例外"
        description="Review 不再承接日常主流程。正常狀況下系統自己找題、寫文、排程與沉長文；這裡只收低信心、高風險、SEO 機會與需要你最後拍板的少數內容。"
      />

      <section className="grid gap-4 xl:grid-cols-3">
        {[
          { label: "待拍板 Threads", value: String(reviewPosts.length), detail: "需要先進 assignment / review workspace" },
          { label: "可直接最後確認", value: String(directPosts.length), detail: "高信心稿，可直接最後確認與送出" },
          { label: "長文擴寫候選", value: String(expansionCandidates.length), detail: "值得沉成 WordPress draft 的強表現貼文" }
        ].map((card) => (
          <article key={card.label} className="metric-card">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold">{card.value}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="glass-panel rounded-[2rem] border border-[var(--border)] p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">By Account</p>
              <h2 className="mt-2 text-3xl font-semibold">哪條營運線真的卡住了</h2>
            </div>
            <Link href="/accounts" className="text-sm font-medium text-[var(--accent)]">
              去帳號總覽
            </Link>
          </div>
          <div className="mt-5 max-h-[18rem] space-y-3 overflow-y-auto pr-1">
            {accountExceptions.length ? (
              accountExceptions.map((item) => (
                <article key={item.accountLabel} className="rounded-[1.35rem] border border-[var(--border)] bg-white/82 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold">{item.accountLabel}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                      {item.reviewCount ? <span className="pill-tag">待拍板 {item.reviewCount}</span> : null}
                      {item.directCount ? <span className="pill-tag">高信心 {item.directCount}</span> : null}
                      {item.optimizationCount ? <span className="pill-tag">優化 {item.optimizationCount}</span> : null}
                      {item.seoCount ? <span className="pill-tag">SEO {item.seoCount}</span> : null}
                      {item.failedCount ? <span className="pill-tag">失敗 {item.failedCount}</span> : null}
                    </div>
                  </div>
                  <p className="mt-3 break-words text-sm leading-7 text-[var(--muted)]">
                    {item.failedCount
                      ? "這條營運線有背景任務失敗，應先確保自動飛輪恢復。"
                      : item.reviewCount
                        ? "這條營運線累積了需要你拍板的灰色地帶內容。"
                        : item.seoCount
                          ? "這條線主要卡在搜尋機會與長文承接，不在 Threads 日常。"
                          : "這條線大多是高信心或優化型內容，你只要最後掃一眼。 "}
                  </p>
                </article>
              ))
            ) : (
              <article className="rounded-[1.35rem] border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)]">
                目前沒有哪條帳號線累積到需要明顯介入的例外，系統多半能自己往下跑。
              </article>
            )}
          </div>
        </article>

        <article className="glass-panel rounded-[2rem] border border-[var(--border)] p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Intervention Queue</p>
              <h2 className="mt-2 text-3xl font-semibold">真正要你出手的只有這些</h2>
            </div>
            <Link href="/factory" className="text-sm font-medium text-[var(--accent)]">
              去工廠紀錄
            </Link>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <article className="rounded-[1.2rem] border border-[var(--border)] bg-white/82 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">待拍板</p>
              <p className="mt-3 text-3xl font-semibold">{reviewPosts.length}</p>
              <p className="mt-2 text-sm text-[var(--muted)]">灰色地帶稿件</p>
            </article>
            <article className="rounded-[1.2rem] border border-[var(--border)] bg-white/82 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">高信心</p>
              <p className="mt-3 text-3xl font-semibold">{directPosts.length}</p>
              <p className="mt-2 text-sm text-[var(--muted)]">只差最後一眼</p>
            </article>
            <article className="rounded-[1.2rem] border border-[var(--border)] bg-white/82 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">失敗任務</p>
              <p className="mt-3 text-3xl font-semibold">{failedLogs.length}</p>
              <p className="mt-2 text-sm text-[var(--muted)]">自動飛輪的斷點</p>
            </article>
          </div>
          <div className="mt-4 max-h-[18rem] space-y-3 overflow-y-auto pr-1">
            {interventionCards.length ? (
              interventionCards.map((item) => (
                <article key={item.label} className="rounded-[1.35rem] border border-[var(--border)] bg-white/82 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold">{item.label}</p>
                      <p className="mt-2 break-words text-sm leading-7 text-[var(--muted)]">{item.detail}</p>
                    </div>
                    <Link href={item.href} className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm">
                      {item.action}
                    </Link>
                  </div>
                </article>
              ))
            ) : (
              <article className="rounded-[1.35rem] border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)]">
                目前沒有明顯例外。Review 這邊只剩例行抽查，系統可以自己往下跑。
              </article>
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {[
          { label: "這輪主軸", detail: missionStrategy.primaryFocus },
          { label: "Threads 判法", detail: missionStrategy.threadBias },
          { label: "長文 / 優化判法", detail: `${missionStrategy.wordpressBias} ${missionStrategy.optimizationBias}` }
        ].map((item) => (
          <article key={item.label} className="rounded-[1.4rem] border border-[var(--border)] bg-white/82 p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">{item.label}</p>
            <p className="mt-3 text-sm leading-7 text-[var(--foreground)]">{item.detail}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article id="seo-opportunity-queue" className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">SEO Opportunity Queue</p>
              <h2 className="mt-2 text-2xl font-semibold">Search Console 告訴你現在最該補哪幾頁</h2>
            </div>
            <Link href="/analytics" className="text-sm font-medium text-[var(--accent)]">
              看流量層
            </Link>
          </div>
          <div className="mt-5 max-h-[22rem] space-y-3 overflow-y-auto pr-1">
            {gscOpportunities.items.length ? (
              gscOpportunities.items.map((item) => (
                <article key={item.id} className="rounded-[1.4rem] border border-[var(--border)] bg-white/82 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{item.label}</p>
                    <span className="pill-tag">
                      {item.query ? `Query ${item.query}` : `Pos ${item.position.toFixed(1)}`}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-medium leading-7">{item.query ?? item.page}</p>
                  <p className="mt-2 break-words text-sm text-[var(--muted)]">{item.reason}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-sm">
                    <span className="rounded-full bg-white px-4 py-2">Clicks {item.clicks}</span>
                    <span className="rounded-full bg-white px-4 py-2">Impressions {item.impressions}</span>
                    <span className="rounded-full bg-white px-4 py-2">CTR {(item.ctr * 100).toFixed(1)}%</span>
                  </div>
                  <p className="mt-3 break-words text-sm text-[var(--muted)]">
                    {item.confidence === "high"
                      ? "高信心機會：站台若開 near full auto + WordPress auto publish，系統可直接處理。"
                      : item.confidence === "medium"
                        ? "中信心機會：系統會先起 WordPress 優化稿，保留給你最後拍板。"
                        : "低信心機會：預設先留在觀察池，不急著自動建稿。"}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-[var(--accent-strong)]">{item.action}</p>
                    <div className="flex flex-wrap gap-2">
                      <SeoOpportunityDraftButton
                        page={item.page}
                        query={item.query}
                        lane={item.lane}
                        confidence={item.confidence}
                        reason={item.reason}
                        action={item.action}
                      />
                      <Link href={item.href} className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium">
                        去處理
                      </Link>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <p className="rounded-[1.4rem] border border-dashed border-[var(--border)] px-4 py-5 text-sm text-[var(--muted)]">
                {gscOpportunities.message}
              </p>
            )}
          </div>
        </article>

        <article className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">Optimization Track</p>
              <h2 className="mt-2 text-2xl font-semibold">14 天觀察後，系統已先幫你產好的優化稿</h2>
            </div>
            <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs text-[var(--foreground)]">
              {optimizationCandidates.length} 篇
            </span>
          </div>
          <div className="mt-5 max-h-[18rem] space-y-3 overflow-y-auto pr-1">
            {optimizationCandidates.length ? (
              optimizationCandidates.map((post) => (
                <article key={post.id} className="rounded-[1.4rem] border border-[var(--border)] bg-white/82 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{post.accountLabel}</p>
                    <span className="pill-tag">{post.statusLabel}</span>
                  </div>
                  <p className="mt-3 text-sm font-medium leading-7">{post.title}</p>
                    <p className="mt-3 break-words text-sm text-[var(--muted)]">{post.detail}</p>
                  <div className="mt-4">
                    <Link href={post.href} className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium">
                      進確認區
                    </Link>
                  </div>
                </article>
              ))
            ) : (
              <p className="rounded-[1.4rem] border border-dashed border-[var(--border)] px-4 py-5 text-sm text-[var(--muted)]">
                目前還沒有進入 14 天優化軌的稿件。等已發布 Threads 累積到觀察窗後，這裡會先幫你準備好下一版。
              </p>
            )}
          </div>
        </article>

        <article className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">Longform Flywheel</p>
              <h2 className="mt-2 text-2xl font-semibold">系統最近自動送進 WordPress 的強表現內容</h2>
            </div>
            <Link href="/wordpress" className="text-sm font-medium text-[var(--accent)]">
              去長文台
            </Link>
          </div>
          <div className="mt-5 max-h-[18rem] space-y-3 overflow-y-auto pr-1">
            {wordpressExpansionFeed.length ? (
              wordpressExpansionFeed.map((item) => (
                <article key={item.id} className="rounded-[1.4rem] border border-[var(--border)] bg-white/82 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{item.accountLabel}</p>
                    <span className="pill-tag">{item.executedAt}</span>
                  </div>
                  <p className="mt-3 break-words text-sm text-[var(--foreground)]">{item.detail}</p>
                  <div className="mt-4">
                    <Link href={item.href} className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium">
                      看來源 Threads
                    </Link>
                  </div>
                </article>
              ))
            ) : (
              <p className="rounded-[1.4rem] border border-dashed border-[var(--border)] px-4 py-5 text-sm text-[var(--muted)]">
                目前還沒有新的自動長文擴寫紀錄。等 Threads 強表現稿件累積到足夠訊號後，這裡會開始顯示自動沉澱結果。
              </p>
            )}
          </div>
        </article>
      </section>

      {expansionCandidates.length > 0 ? (
        <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">WordPress Expansion</p>
              <h2 className="mt-2 text-2xl font-semibold">強表現 Threads，先在這裡決定要不要沉成長文</h2>
            </div>
            <Link href="/wordpress" className="text-sm font-medium text-[var(--accent)]">
              去 WordPress 草稿台
            </Link>
          </div>
          <div className="mt-5 grid max-h-[22rem] gap-3 overflow-y-auto pr-1">
            {expansionCandidates.slice(0, 4).map((post) => (
              <article key={post.id} className="rounded-[1.4rem] border border-[var(--border)] bg-white/82 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{post.account}</p>
                  <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs text-[var(--foreground)]">
                    長文分數 {post.longformScore}
                  </span>
                </div>
                <p className="mt-3 text-sm font-medium leading-7">{post.text}</p>
                <p className="mt-3 break-words text-sm text-[var(--muted)]">{post.reason}</p>
                <p className="mt-3 rounded-[1.1rem] border border-[var(--border)] bg-[rgba(255,252,248,0.86)] px-4 py-3 text-sm leading-7 break-words text-[var(--accent-strong)]">
                  {post.missionReason}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  <span className="rounded-full bg-white px-4 py-2">Views {post.views}</span>
                  <span className="rounded-full bg-white px-4 py-2">Replies {post.replies}</span>
                  <span className="rounded-full bg-white px-4 py-2">{post.momentumLabel}</span>
                </div>
                <div className="mt-4">
                  <SyncWordPressButton postId={post.id} />
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section id="review-queue" className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
        <div className="mb-6">
          <p className="text-sm text-[var(--muted)]">這裡預設先看待拍板 Threads。高信心稿仍然先給你最後確認，不直接把你推進發布表單。</p>
          <p className="mt-1 text-xs text-[var(--muted)]">如果你只想處理最後一哩，就先看「可直接發」那層；如果要給 AI assignment，就進確認區。</p>
        </div>
        <PostsList posts={pendingReviewPosts} />
      </section>
    </div>
  );
}
