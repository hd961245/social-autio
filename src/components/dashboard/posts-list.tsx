"use client";

import { useMemo, useState, useTransition } from "react";
import type { PostSummary } from "@/lib/dashboard-data";

type StatusFilter = "draft" | "scheduled" | "published" | "failed" | "all";
type TopicFilter = "all" | "news" | "opinion" | "howto";
type ReviewLaneFilter = "all" | "direct" | "review";

function getStatusLabel(status: string, requiresApproval?: boolean, approvalState?: string | null) {
  if (requiresApproval && approvalState === "requested") return "待 Telegram";
  if (requiresApproval && approvalState === "approved") return "已批准";
  if (status === "draft") return "待確認";
  if (status === "scheduled") return "已排程";
  if (status === "published") return "已發布";
  if (status === "failed") return "失敗";
  if (status === "approval_rejected") return "已拒絕";
  if (status === "awaiting_approval") return "待 Telegram";
  return status;
}

function getStatusClasses(status: string, requiresApproval?: boolean, approvalState?: string | null) {
  if (requiresApproval && approvalState === "requested") return "border-sky-200 bg-sky-50 text-sky-700";
  if (requiresApproval && approvalState === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "published") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "scheduled") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "draft") return "border-stone-200 bg-stone-100 text-stone-700";
  if (status === "failed" || status === "approval_rejected") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-[var(--border)] bg-white text-[var(--foreground)]";
}

function truncate(value: string, length = 82) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > length ? `${normalized.slice(0, length - 1)}…` : normalized;
}

function truncateSoft(value: string, length = 140) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > length ? `${normalized.slice(0, length - 1)}…` : normalized;
}

function getTopicTagLabel(topicTag?: string | null) {
  if (topicTag === "news") return "快訊";
  if (topicTag === "opinion") return "觀點";
  if (topicTag === "howto") return "教學";
  return null;
}

function isConfirmable(post: PostSummary) {
  return post.platform === "threads" && ["draft", "failed", "approval_rejected", "scheduled", "awaiting_approval"].includes(post.status);
}

export function PostsList({ posts }: { posts: PostSummary[] }) {
  const [items, setItems] = useState(posts);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("draft");
  const [personaFilter, setPersonaFilter] = useState("all");
  const [topicFilter, setTopicFilter] = useState<TopicFilter>("all");
  const [reviewLaneFilter, setReviewLaneFilter] = useState<ReviewLaneFilter>("all");
  const [todayOnly, setTodayOnly] = useState(true);
  const [topPicksOnly, setTopPicksOnly] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const personaOptions = Array.from(
    new Set(
      items
        .filter((post) => post.platform === "threads")
        .map((post) => post.personaLabel || post.account)
        .filter(Boolean)
    )
  );

  const visibleItems = useMemo(() => {
    const filtered = items.filter((post) => {
      const matchesThreadsOrWp = post.platform === "threads" || post.platform === "wordpress";
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "draft" ? ["draft", "awaiting_approval", "approval_rejected"].includes(post.status) : post.status === statusFilter);
      const matchesPersona =
        personaFilter === "all" ||
        (post.platform === "threads" && (post.personaLabel || post.account) === personaFilter);
      const matchesTopic =
        topicFilter === "all" ||
        (post.platform === "threads" && post.topicTag === topicFilter);
      const matchesReviewLane =
        reviewLaneFilter === "all" ||
        (post.platform === "threads" && post.reviewLane === reviewLaneFilter);
      const matchesToday =
        !todayOnly ||
        (post.platform === "threads" && ["draft", "awaiting_approval", "approval_rejected"].includes(post.status) && post.isFreshToday);
      const haystack = `${post.account} ${post.personaLabel ?? ""} ${post.platform} ${post.text} ${post.title ?? ""}`.toLowerCase();
      const matchesQuery = !query.trim() || haystack.includes(query.trim().toLowerCase());

      return matchesThreadsOrWp && matchesStatus && matchesPersona && matchesTopic && matchesReviewLane && matchesToday && matchesQuery;
    });

    if (!topPicksOnly || !todayOnly || statusFilter !== "draft") {
      return filtered;
    }

    const threadFreshDrafts = filtered.filter(
      (post) =>
        post.platform === "threads" &&
        post.isFreshToday &&
        ["draft", "awaiting_approval", "approval_rejected"].includes(post.status)
    );
    const nonThreadItems = filtered.filter(
      (post) =>
        !(post.platform === "threads" && post.isFreshToday && ["draft", "awaiting_approval", "approval_rejected"].includes(post.status))
    );

    const grouped = new Map<string, typeof threadFreshDrafts>();
    for (const post of threadFreshDrafts) {
      const key = post.personaLabel || post.account;
      const group = grouped.get(key) ?? [];
      group.push(post);
      grouped.set(key, group);
    }

    const curated = Array.from(grouped.values()).flatMap((group) =>
      [...group]
        .sort((left, right) => (right.reviewScore ?? 0) - (left.reviewScore ?? 0))
        .slice(0, 3)
    );

    return [...curated, ...nonThreadItems];
  }, [items, personaFilter, topicFilter, reviewLaneFilter, todayOnly, topPicksOnly, query, statusFilter]);

  const selectableIds = visibleItems.filter(isConfirmable).map((post) => post.id);
  const selectedCount = selectedIds.length;
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.includes(id));

  const summary = useMemo(() => {
    const draft = items.filter((post) => post.platform === "threads" && ["draft", "awaiting_approval", "approval_rejected"].includes(post.status)).length;
    const freshToday = items.filter(
      (post) => post.platform === "threads" && ["draft", "awaiting_approval", "approval_rejected"].includes(post.status) && post.isFreshToday
    ).length;
    const scheduled = items.filter((post) => post.platform === "threads" && post.status === "scheduled").length;
    const published = items.filter((post) => post.platform === "threads" && post.status === "published").length;
    const wordpress = items.filter((post) => post.platform === "wordpress").length;

    return {
      freshToday,
      draft,
      scheduled,
      published,
      wordpress
    };
  }, [items]);

  function toggleSelection(postId: string, checked: boolean) {
    setSelectedIds((current) => {
      if (checked) {
        return Array.from(new Set([...current, postId]));
      }

      return current.filter((id) => id !== postId);
    });
  }

  function syncPublishedState(publishedIds: string[]) {
    const idSet = new Set(publishedIds);
    setItems((current) =>
      current.map((item) =>
        idSet.has(item.id)
          ? {
              ...item,
              status: "published",
              requiresApproval: false,
              approvalState: null,
              scheduledAt: "剛剛"
            }
          : item
      )
    );
    setSelectedIds((current) => current.filter((id) => !idSet.has(id)));
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[1.8rem] border border-[var(--border)] bg-white/80 p-5">
        <div className="grid gap-3 md:grid-cols-4">
          {[
            { label: "今日新稿", value: summary.freshToday, hint: "今天 AI 新生成、最值得先看" },
            { label: "待確認", value: summary.draft, hint: "AI 產好，勾選即可發" },
            { label: "已排程", value: summary.scheduled, hint: "等 Inngest 自動送出" },
            { label: "已發布", value: summary.published, hint: "最近成功發出的 Threads" }
          ].map((card) => (
            <article key={card.label} className="rounded-[1.4rem] border border-[var(--border)] bg-[rgba(255,252,248,0.9)] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{card.label}</p>
              <p className="mt-3 text-3xl font-semibold">{card.value}</p>
              <p className="mt-2 text-sm text-[var(--muted)]">{card.hint}</p>
            </article>
          ))}
        </div>
        <div className="mt-5 rounded-[1.4rem] border border-[var(--border)] bg-[rgba(249,245,238,0.82)] p-4">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">工作量摘要</p>
              <p className="text-xs text-[var(--muted)]">先把待確認的文勾起來，確認方向後就能直接發。</p>
            </div>
            <p className="text-sm text-[var(--muted)]">總計 {summary.draft + summary.scheduled + summary.published + summary.wordpress} 筆</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {[
              { label: "今日新稿", value: summary.freshToday },
              { label: "待確認", value: summary.draft },
              { label: "已排程", value: summary.scheduled },
              { label: "已發布", value: summary.published },
              { label: "WP 草稿", value: summary.wordpress }
            ].map((entry) => (
              <div key={entry.label} className="rounded-[1rem] border border-[var(--border)] bg-white/85 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">{entry.label}</p>
                <p className="mt-2 text-2xl font-semibold">{entry.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[1.8rem] border border-[var(--border)] bg-white/78 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {[
                { value: "draft", label: "待確認" },
                { value: "scheduled", label: "已排程" },
                { value: "published", label: "已發布" },
                { value: "failed", label: "失敗" },
                { value: "all", label: "全部" }
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`rounded-full px-4 py-2 text-sm ${
                    statusFilter === option.value ? "bg-[var(--card-dark)] text-white" : "bg-[rgba(255,255,255,0.9)] text-[var(--foreground)]"
                  }`}
                  onClick={() => setStatusFilter(option.value as StatusFilter)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`rounded-full px-4 py-2 text-sm ${
                  todayOnly ? "bg-[var(--card-dark)] text-white" : "bg-[rgba(255,255,255,0.9)] text-[var(--foreground)]"
                }`}
                onClick={() => setTodayOnly((current) => !current)}
              >
                {todayOnly ? "只看今天 AI 新稿" : "包含舊稿"}
              </button>
              {personaOptions.length > 0 ? (
                <select
                  className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm outline-none"
                  value={personaFilter}
                  onChange={(event) => setPersonaFilter(event.target.value)}
                >
                  <option value="all">全部 persona</option>
                  {personaOptions.map((persona) => (
                    <option key={persona} value={persona}>
                      {persona}
                    </option>
                  ))}
                </select>
              ) : null}
              <select
                className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm outline-none"
                value={topicFilter}
                onChange={(event) => setTopicFilter(event.target.value as TopicFilter)}
              >
                <option value="all">全部類型</option>
                <option value="news">快訊</option>
                <option value="opinion">觀點</option>
                <option value="howto">教學</option>
              </select>
              <select
                className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm outline-none"
                value={reviewLaneFilter}
                onChange={(event) => setReviewLaneFilter(event.target.value as ReviewLaneFilter)}
              >
                <option value="all">全部決策層</option>
                <option value="direct">可直接發</option>
                <option value="review">先看一下</option>
              </select>
              <input
                className="w-full rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm outline-none lg:w-72"
                placeholder="搜尋帳號、標題或文案"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>

          <div className="rounded-[1.2rem] border border-[var(--border)] bg-[rgba(249,245,238,0.8)] px-4 py-3 text-sm">
            <p className="font-medium">今天的動作</p>
            <p className="mt-1 text-[var(--muted)]">
              {selectedCount > 0
                ? `已勾選 ${selectedCount} 篇，可直接發到 Threads。`
                : todayOnly && topPicksOnly
                  ? "先看每個 persona 今天最值得看的 2-3 篇，再決定要發哪篇。"
                  : "先勾選你要送出的文，再一次直接發布。"}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[1.4rem] border border-[var(--border)] bg-[rgba(255,252,248,0.9)] px-4 py-3">
          <button
            type="button"
            className={`rounded-full px-4 py-2 text-sm ${
              topPicksOnly ? "bg-[var(--card-dark)] text-white" : "bg-[rgba(255,255,255,0.9)] text-[var(--foreground)]"
            }`}
            onClick={() => setTopPicksOnly((current) => !current)}
          >
            {topPicksOnly ? "每個 persona 只看精選 3 篇" : "顯示所有候選稿"}
          </button>
          <label className="inline-flex items-center gap-2 text-sm text-[var(--muted)]">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-[var(--border)]"
              checked={allSelected}
              onChange={(event) => {
                setSelectedIds(event.target.checked ? selectableIds : []);
              }}
            />
            本頁全選
          </label>
          <button
            type="button"
            disabled={selectedCount === 0 || isPending}
            className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-45"
            onClick={() =>
              startTransition(async () => {
                const response = await fetch("/api/posts/bulk-publish", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                    postIds: selectedIds
                  })
                });
                const result = await response.json();
                setMessage(result.message ?? (response.ok ? "已送出。" : "發布失敗"));

                if (result.publishedIds?.length) {
                  syncPublishedState(result.publishedIds);
                }
              })
            }
          >
            勾選後直接發
          </button>
          <a href="/compose" className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm">
            新增一篇
          </a>
          <span className="text-xs text-[var(--muted)]">只有 Threads 草稿 / 失敗稿 / 已拒絕稿可直接從這裡發布。</span>
        </div>

        <div className="mt-5 overflow-hidden rounded-[1.6rem] border border-[var(--border)]">
          <div className="grid grid-cols-[42px_minmax(0,1.4fr)_132px_132px_132px_132px] gap-3 bg-[rgba(249,245,238,0.92)] px-4 py-3 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
            <span />
            <span>文章</span>
            <span>帳號</span>
            <span>狀態</span>
            <span>時間</span>
            <span>動作</span>
          </div>

          {visibleItems.map((post) => {
            const selectable = isConfirmable(post);

            return (
              <article
                key={post.id}
                className="grid grid-cols-[42px_minmax(0,1.4fr)_132px_132px_132px_132px] gap-3 border-t border-[var(--border)] bg-white/88 px-4 py-4 text-sm"
              >
                <label className="flex items-start justify-center pt-1">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[var(--border)]"
                    disabled={!selectable}
                    checked={selectedIds.includes(post.id)}
                    onChange={(event) => toggleSelection(post.id, event.target.checked)}
                  />
                </label>

                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{truncate(post.title ?? post.text, 92)}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-6 text-[var(--muted)]">{truncate(post.text, 150)}</p>
                  {post.candidateRationale ? (
                    <p className="mt-2 line-clamp-2 text-xs leading-6 text-[var(--accent)]/90">
                      {truncateSoft(post.candidateRationale, 170)}
                    </p>
                  ) : null}
                  {post.laneReason ? (
                    <p className="mt-2 line-clamp-3 text-xs leading-6 text-[var(--muted)]">
                      {truncateSoft(post.laneReason, 185)}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {post.personaLabel ? (
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">{post.personaLabel}</p>
                    ) : null}
                    {getTopicTagLabel(post.topicTag) ? <span className="pill-tag">{getTopicTagLabel(post.topicTag)}</span> : null}
                    {post.reviewLane === "direct" ? <span className="pill-tag">可直接發</span> : null}
                    {post.reviewLane === "review" ? <span className="pill-tag">先看一下</span> : null}
                    {post.reviewScore ? <span className="pill-tag">精選分數 {post.reviewScore}</span> : null}
                    {post.suggestedScheduleLabel ? <span className="pill-tag">建議時段 {post.suggestedScheduleLabel}</span> : null}
                    {post.suggestedCta ? <span className="pill-tag">CTA {truncateSoft(post.suggestedCta, 30)}</span> : null}
                  </div>
                </div>

                <div className="text-sm">
                  <p className="font-medium">{post.account}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{post.platform === "wordpress" ? "WordPress" : "Threads"}</p>
                </div>

                <div>
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs ${getStatusClasses(post.status, post.requiresApproval, post.approvalState)}`}>
                    {getStatusLabel(post.status, post.requiresApproval, post.approvalState)}
                  </span>
                </div>

                <div className="text-xs leading-6 text-[var(--muted)]">
                  <p>{post.scheduledAt}</p>
                  {post.requiresApproval ? <p>先經 Telegram</p> : null}
                </div>

                <div className="flex flex-col items-start gap-2">
                  {selectable ? (
                    <a href={`/review/${post.id}`} className="rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-xs">
                      編輯
                    </a>
                  ) : post.platform === "threads" && post.status === "published" ? (
                    <a href={`/posts/${post.id}`} className="rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-xs">
                      看指標
                    </a>
                  ) : (
                    <a href={`/compose?postId=${post.id}`} className="rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-xs">
                      打開
                    </a>
                  )}
                  {post.platformUrl ? (
                    <a href={post.platformUrl} target="_blank" className="text-xs text-[var(--accent)]">
                      平台查看
                    </a>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {visibleItems.length === 0 ? (
        <article className="rounded-3xl border border-dashed border-[var(--border)] p-5 text-sm text-[var(--muted)]">
          目前這個工作表還沒有符合條件的文章。
        </article>
      ) : null}

      {message ? <p className="text-sm text-[var(--muted)]">{message}</p> : null}
    </div>
  );
}
