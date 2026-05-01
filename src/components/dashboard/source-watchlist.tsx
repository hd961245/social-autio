"use client";

import { useState, useTransition } from "react";
import { FINANCE_STARTER_PACK, FINANCE_STARTER_PACKS } from "@/lib/content/source-starter-packs";

export type SourceItem = {
  id: string;
  label: string;
  sourceType: "rss" | "url" | "site";
  sourceUrl: string;
  isActive: boolean;
  autoImportEnabled: boolean;
  preferredOutcome: "threads" | "wordpress";
  lastFetchedAt: string;
  lastItemTitle: string;
  lastItemUrl: string;
  lastExcerpt: string;
  lastHandledStatus: "new" | "imported" | "skipped";
  lastError: string;
};

type SourceLaneFilter = "all" | "official" | "deep" | "feed";

function getSourceLaneMeta(item: Pick<SourceItem, "label" | "sourceType" | "sourceUrl" | "preferredOutcome">) {
  const text = `${item.label} ${item.sourceUrl}`.toLowerCase();

  if (
    /(twse|sec\.gov|federalreserve|bls\.gov|bea\.gov|treasury)/i.test(text) ||
    item.label.includes("官方")
  ) {
    return {
      label: "官方一手訊號",
      classes: "border-sky-200 bg-sky-50 text-sky-700",
      detail: "偏政策、監管、官方數據與一手公告。"
    };
  }

  if (item.sourceType === "site" || item.preferredOutcome === "wordpress") {
    return {
      label: "深度文章 / 研究站",
      classes: "border-violet-200 bg-violet-50 text-violet-700",
      detail: "偏文章本體、研究內容與長文沉澱。"
    };
  }

  return {
    label: "媒體快訊 / Feed",
    classes: "border-amber-200 bg-amber-50 text-amber-700",
    detail: "偏 headline、快訊與每日 Threads 候選稿。"
  };
}

export function SourceWatchlist({ initialItems }: { initialItems: SourceItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [laneFilter, setLaneFilter] = useState<SourceLaneFilter>("all");
  const [label, setLabel] = useState("");
  const [sourceType, setSourceType] = useState<"rss" | "url" | "site">("rss");
  const [sourceUrl, setSourceUrl] = useState("");
  const [autoImportEnabled, setAutoImportEnabled] = useState(true);
  const [preferredOutcome, setPreferredOutcome] = useState<"threads" | "wordpress">("threads");
  const [message, setMessage] = useState<string | null>(null);
  const [discovery, setDiscovery] = useState<{
    recommendedType: "rss" | "site" | "url";
    message: string;
    feedLinks: string[];
    sampleArticleUrls: string[];
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const starterUrls = new Set(FINANCE_STARTER_PACK.map((item) => item.sourceUrl));
  const financeStarterCount = items.filter((item) => starterUrls.has(item.sourceUrl)).length;
  const financeStarterAutoCount = items.filter(
    (item) => starterUrls.has(item.sourceUrl) && item.autoImportEnabled
  ).length;
  const filteredItems = items.filter((item) => {
    if (laneFilter === "all") return true;
    const laneLabel = getSourceLaneMeta(item).label;
    if (laneFilter === "official") return laneLabel === "官方一手訊號";
    if (laneFilter === "deep") return laneLabel === "深度文章 / 研究站";
    return laneLabel === "媒體快訊 / Feed";
  });

  function getStatusLabel(status: SourceItem["lastHandledStatus"]) {
    if (status === "imported") return "已改寫";
    if (status === "skipped") return "已跳過";
    return "待處理";
  }

  function getStatusClasses(status: SourceItem["lastHandledStatus"]) {
    if (status === "imported") return "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (status === "skipped") return "border-stone-200 bg-stone-100 text-stone-700";
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Starter Pack</p>
            <h2 className="mt-2 text-3xl font-semibold">理財新聞一鍵起手包</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
              如果你其中一個 Threads 和 WordPress 都是理財題材，先把來源包拆成題型來收最省事。你可以只加台股、只加總經，或把四組全加進來。
            </p>
            <div className="mt-5 grid gap-3 xl:grid-cols-2">
              {FINANCE_STARTER_PACKS.map((pack) => {
                const packUrls = new Set(pack.items.map((item) => item.sourceUrl));
                const includedCount = items.filter((item) => packUrls.has(item.sourceUrl)).length;

                return (
                  <article key={pack.id} className="rounded-[1.4rem] border border-[var(--border)] bg-white/76 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{pack.shortLabel}</p>
                        <h3 className="mt-2 text-lg font-semibold">{pack.title}</h3>
                      </div>
                      <div className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted)]">
                        {includedCount}/{pack.items.length}
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{pack.description}</p>
                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      <div className="rounded-[1rem] border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2">
                        <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">Focus</p>
                        <p className="mt-2 text-sm">{pack.focus}</p>
                      </div>
                      <div className="rounded-[1rem] border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2">
                        <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">Ingest</p>
                        <p className="mt-2 text-sm">{pack.ingestHint}</p>
                      </div>
                      <div className="rounded-[1rem] border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2">
                        <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">Best For</p>
                        <p className="mt-2 text-sm">{pack.bestFor}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {pack.items.map((item) => (
                        <span key={item.sourceUrl} className="pill-tag">
                          {item.label}
                        </span>
                      ))}
                    </div>
                    <button
                      disabled={isPending}
                      className="mt-4 rounded-full bg-[var(--accent)] px-4 py-2 text-sm text-white disabled:opacity-60"
                      onClick={() =>
                        startTransition(async () => {
                          setMessage(null);
                          const response = await fetch("/api/sources/starter-pack", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ packId: pack.id })
                          });
                          const result = await response.json();

                          if (!response.ok) {
                            setMessage(result.message ?? "加入 starter pack 失敗");
                            return;
                          }

                          const createdItems = (result.items ?? []).map((item: SourceItem) => ({
                            id: item.id,
                            label: item.label,
                            sourceType: item.sourceType,
                            sourceUrl: item.sourceUrl,
                            isActive: item.isActive,
                            autoImportEnabled: item.autoImportEnabled,
                            preferredOutcome: item.preferredOutcome,
                            lastFetchedAt: "尚未刷新",
                            lastItemTitle: "",
                            lastItemUrl: "",
                            lastExcerpt: "",
                            lastHandledStatus: "new" as const,
                            lastError: ""
                          }));

                          if (createdItems.length) {
                            setItems((current) => [...createdItems, ...current]);
                          }

                          setMessage(
                            createdItems.length
                              ? `已加入 ${pack.title} 的 ${createdItems.length} 個來源。`
                              : `${pack.title} 這組來源已經都在名單裡了。`
                          );
                        })
                      }
                    >
                      {isPending ? "加入中..." : `加入${pack.shortLabel}來源`}
                    </button>
                  </article>
                );
              })}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            {[
              { label: "已收進來源", value: financeStarterCount, detail: "目前已加入的理財 starter feeds" },
              { label: "自動匯入中", value: financeStarterAutoCount, detail: "會每天自動產候選稿的來源" },
              {
                label: "預設候選數",
                value: 3,
                detail: "每日預期先挑 2-3 篇 Threads 候選稿"
              }
            ].map((card) => (
              <article key={card.label} className="metric-card">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">{card.label}</p>
                <p className="mt-3 text-3xl font-semibold">{card.value}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{card.detail}</p>
              </article>
            ))}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            disabled={isPending}
            className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm disabled:opacity-60"
            onClick={() =>
              startTransition(async () => {
                setMessage(null);
                const response = await fetch("/api/sources/starter-pack", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ packId: "all" })
                });
                const result = await response.json();

                if (!response.ok) {
                  setMessage(result.message ?? "加入全部 starter packs 失敗");
                  return;
                }

                const createdItems = (result.items ?? []).map((item: SourceItem) => ({
                  id: item.id,
                  label: item.label,
                  sourceType: item.sourceType,
                  sourceUrl: item.sourceUrl,
                  isActive: item.isActive,
                  autoImportEnabled: item.autoImportEnabled,
                  preferredOutcome: item.preferredOutcome,
                  lastFetchedAt: "尚未刷新",
                  lastItemTitle: "",
                  lastItemUrl: "",
                  lastExcerpt: "",
                  lastHandledStatus: "new" as const,
                  lastError: ""
                }));

                if (createdItems.length) {
                  setItems((current) => [...createdItems, ...current]);
                }

                setMessage(
                  createdItems.length
                    ? `已一次加入 ${createdItems.length} 個理財來源。`
                    : "全部理財來源都已經在名單裡了。"
                );
              })
            }
          >
            {isPending ? "加入中..." : "全部一起加入"}
          </button>
          <a
            href="/help?topic=knowledge-inputs"
            className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm"
          >
            看知識輸入策略
          </a>
        </div>
      </section>

      <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Source Watchlist</p>
          <h2 className="mt-2 text-3xl font-semibold">固定追蹤來源</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
            先收你常看的 RSS、部落格或公開文章頁。現在也支援網站首頁 / 無 RSS 部落格，會先找 feed，再試 sitemap 和文章連結，最後把正文正規化後交給 AI 改寫。
          </p>
        </div>

        <form
          className="mt-6 grid gap-4 lg:grid-cols-[1fr_160px_1.1fr_180px_auto]"
            onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              setMessage(null);
              setDiscovery(null);
              const response = await fetch("/api/sources", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ label, sourceType, sourceUrl, autoImportEnabled, preferredOutcome })
              });
              const result = await response.json();

              if (!response.ok) {
                setMessage(result.message ?? "新增來源失敗");
                return;
              }

              setItems((current) => [
                {
                  id: result.item.id,
                  label: result.item.label,
                  sourceType: result.item.sourceType,
                  sourceUrl: result.item.sourceUrl,
                  isActive: result.item.isActive,
                  autoImportEnabled: result.item.autoImportEnabled,
                  preferredOutcome: result.item.preferredOutcome,
                  lastFetchedAt: "尚未刷新",
                  lastItemTitle: "",
                  lastItemUrl: "",
                  lastExcerpt: "",
                  lastHandledStatus: "new",
                  lastError: ""
                },
                ...current
              ]);
              setLabel("");
              setSourceUrl("");
              setAutoImportEnabled(true);
              setPreferredOutcome("threads");
              setMessage("已加入來源名單。");
            });
          }}
        >
          <input
            className="rounded-2xl border border-[var(--border)] bg-white/85 px-4 py-3"
            placeholder="來源名稱，例如 Growth Blog"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            required
          />
          <select
            className="rounded-2xl border border-[var(--border)] bg-white/85 px-4 py-3"
            value={sourceType}
            onChange={(event) => setSourceType(event.target.value as "rss" | "url" | "site")}
          >
            <option value="rss">RSS</option>
            <option value="url">文章頁 / Blog</option>
            <option value="site">網站 / 無 RSS 部落格</option>
          </select>
          <input
            className="rounded-2xl border border-[var(--border)] bg-white/85 px-4 py-3"
            placeholder={
              sourceType === "rss"
                ? "https://site.com/feed.xml"
                : sourceType === "site"
                  ? "https://site.com 或 https://blog.site.com"
                  : "https://site.com/article"
            }
            value={sourceUrl}
            onChange={(event) => setSourceUrl(event.target.value)}
            required
          />
          <select
            className="rounded-2xl border border-[var(--border)] bg-white/85 px-4 py-3"
            value={preferredOutcome}
            onChange={(event) => setPreferredOutcome(event.target.value as "threads" | "wordpress")}
          >
            <option value="threads">日更進 Threads 草稿</option>
            <option value="wordpress">日更進 WordPress 草稿</option>
          </select>
          <button disabled={isPending} className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm text-white">
            {isPending ? "新增中..." : "加入名單"}
          </button>
        </form>
        <label className="mt-4 flex items-center gap-3 text-sm text-[var(--muted)]">
          <input type="checkbox" checked={autoImportEnabled} onChange={(event) => setAutoImportEnabled(event.target.checked)} />
          每天自動抓最近幾篇，挑值得寫的內容進站內草稿池
        </label>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isPending || !sourceUrl.trim()}
            className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm disabled:opacity-50"
            onClick={() =>
              startTransition(async () => {
                setMessage(null);
                const response = await fetch("/api/sources/discover", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ sourceUrl })
                });
                const result = await response.json();

                if (!response.ok) {
                  setMessage(result.message ?? "來源判斷失敗");
                  return;
                }

                setDiscovery(result.result);
                setSourceType(result.result.recommendedType);
                setMessage(`已幫你判斷：建議用 ${result.result.recommendedType.toUpperCase()} 模式。`);
              })
            }
          >
            幫我判斷來源模式
          </button>
        </div>
        <div className="mt-4 grid gap-3 xl:grid-cols-3">
          {[
            {
              label: "財經新聞 / Feed",
              detail: "適合台美股即時訊號、每日快評與 Threads 候選稿。先用 starter packs 起手最快。"
            },
            {
              label: "無 RSS 部落格 / 研究站",
              detail: "改用網站模式。系統會先找 feed，再試 sitemap，最後抽文章本體給 AI 改寫。"
            },
            {
              label: "YouTube / podcast / 自有筆記",
              detail: "這條更偏長期知識沉澱。現階段先當策略層，之後會進 transcript ingestion。"
            }
          ].map((lane) => (
            <article key={lane.label} className="rounded-[1.2rem] border border-[var(--border)] bg-white/74 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">{lane.label}</p>
              <p className="mt-3 text-sm leading-7 text-[var(--foreground)]">{lane.detail}</p>
            </article>
          ))}
        </div>
        {discovery ? (
          <article className="mt-4 rounded-[1.4rem] border border-[var(--border)] bg-white/78 p-4 text-sm">
            <p className="font-medium">建議模式：{discovery.recommendedType.toUpperCase()}</p>
            <p className="mt-2 text-[var(--muted)]">{discovery.message}</p>
            {discovery.feedLinks.length ? (
              <div className="mt-3">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">找到的 Feed</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {discovery.feedLinks.map((item) => (
                    <span key={item} className="pill-tag">{item}</span>
                  ))}
                </div>
              </div>
            ) : null}
            {discovery.sampleArticleUrls.length ? (
              <div className="mt-3">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">文章樣本</p>
                <div className="mt-2 space-y-2">
                  {discovery.sampleArticleUrls.map((item) => (
                    <p key={item} className="truncate text-[var(--muted)]">{item}</p>
                  ))}
                </div>
              </div>
            ) : null}
          </article>
        ) : null}
        {message ? <p className="mt-4 text-sm text-[var(--muted)]">{message}</p> : null}
      </section>

      <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Tracked Sources</p>
            <h2 className="mt-2 text-3xl font-semibold">來源列表</h2>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {[
            { id: "all", label: "全部來源" },
            { id: "official", label: "官方一手訊號" },
            { id: "deep", label: "深度文章 / 研究站" },
            { id: "feed", label: "媒體快訊 / Feed" }
          ].map((option) => {
            const active = laneFilter === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setLaneFilter(option.id as SourceLaneFilter)}
                className={`rounded-full border px-4 py-2 text-sm ${
                  active
                    ? "border-[var(--card-dark)] bg-[var(--card-dark)] text-white"
                    : "border-[var(--border)] bg-white text-[var(--foreground)]"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="mt-6 grid gap-4">
          {filteredItems.map((item) => (
            <article key={item.id} className="rounded-[1.6rem] border border-[var(--border)] bg-white/75 p-5">
              {(() => {
                const lane = getSourceLaneMeta(item);

                return (
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs ${lane.classes}`}>{lane.label}</span>
                    <span className="text-xs text-[var(--muted)]">{lane.detail}</span>
                  </div>
                );
              })()}
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                    {item.sourceType} · 最後刷新 {item.lastFetchedAt}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-semibold">{item.label}</h3>
                    <span className={`rounded-full border px-3 py-1 text-xs ${getStatusClasses(item.lastHandledStatus)}`}>
                      {getStatusLabel(item.lastHandledStatus)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[var(--muted)]">{item.sourceUrl}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                    {item.autoImportEnabled ? `daily auto-import → ${item.preferredOutcome}` : "manual import only"}
                  </p>
                  {item.lastItemTitle ? <p className="mt-4 text-sm font-medium">{item.lastItemTitle}</p> : null}
                  {item.lastExcerpt ? <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{item.lastExcerpt}</p> : null}
                  {item.lastError ? <p className="mt-2 text-sm text-rose-600">{item.lastError}</p> : null}
                </div>
                <div className="flex shrink-0 flex-wrap gap-3">
                  {item.lastItemUrl ? (
                    <a
                      href={item.lastItemUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm"
                    >
                      看最新原文
                    </a>
                  ) : null}
                  <button
                    disabled={isPending}
                    className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm"
                    onClick={() =>
                      startTransition(async () => {
                        setMessage(null);
                        const response = await fetch(`/api/sources/${item.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ autoImportEnabled: !item.autoImportEnabled })
                        });
                        const result = await response.json();

                        if (!response.ok) {
                          setMessage(result.message ?? "更新失敗");
                          return;
                        }

                        setItems((current) =>
                          current.map((source) =>
                            source.id === item.id ? { ...source, autoImportEnabled: !source.autoImportEnabled } : source
                          )
                        );
                        setMessage(item.autoImportEnabled ? "已改成手動匯入。" : "已開啟每日自動匯入。");
                      })
                    }
                  >
                    {item.autoImportEnabled ? "改成手動" : "開啟日更"}
                  </button>
                  <button
                    disabled={isPending}
                    className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm"
                    onClick={() =>
                      startTransition(async () => {
                        setMessage(null);
                        const response = await fetch(`/api/sources/${item.id}/refresh`, { method: "POST" });
                        const result = await response.json();

                        if (!response.ok) {
                          setMessage(result.message ?? "刷新失敗");
                          return;
                        }

                        setItems((current) =>
                          current.map((source) =>
                            source.id === item.id
                              ? {
                                  ...source,
                                  lastFetchedAt: "剛剛",
                                  lastItemTitle: result.preview.title,
                                  lastItemUrl: result.preview.url,
                                  lastExcerpt: result.preview.excerpt,
                                  lastHandledStatus: source.lastHandledStatus,
                                  lastError: ""
                                }
                              : source
                          )
                        );
                        setMessage(`已刷新 ${item.label}`);
                      })
                    }
                  >
                    刷新來源
                  </button>
                  <button
                    disabled={isPending}
                    className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm text-white"
                    onClick={() =>
                      startTransition(async () => {
                        setMessage(null);
                        const response = await fetch(`/api/sources/${item.id}/refresh`, { method: "PUT" });
                        const result = await response.json();

                        if (!response.ok) {
                          setMessage(result.message ?? "建立草稿失敗");
                          return;
                        }

                        setItems((current) =>
                          current.map((source) =>
                            source.id === item.id
                              ? {
                                  ...source,
                                  lastFetchedAt: "剛剛",
                                  lastItemTitle: result.preview.title,
                                  lastItemUrl: result.preview.url,
                                  lastExcerpt: result.preview.excerpt,
                                  lastHandledStatus: result.duplicated ? source.lastHandledStatus : "imported",
                                  lastError: ""
                                }
                              : source
                          )
                        );
                        setMessage(
                          result.duplicated
                            ? "最近幾篇都處理過了，這次不重複建草稿。"
                            : "已從來源挑出值得寫的內容，去總表就能直接看候選稿。"
                        );
                      })
                    }
                  >
                    一鍵改寫
                  </button>
                  <button
                    disabled={isPending}
                    className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm"
                    onClick={() =>
                      startTransition(async () => {
                        setMessage(null);
                        const response = await fetch(`/api/sources/${item.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ lastHandledStatus: "skipped" })
                        });
                        const result = await response.json();

                        if (!response.ok) {
                          setMessage(result.message ?? "標記失敗");
                          return;
                        }

                        setItems((current) =>
                          current.map((source) =>
                            source.id === item.id ? { ...source, lastHandledStatus: "skipped" } : source
                          )
                        );
                        setMessage("已標記為先略過。");
                      })
                    }
                  >
                    先略過
                  </button>
                  <button
                    disabled={isPending}
                    className="rounded-full border border-rose-200 bg-white px-4 py-2 text-sm text-rose-700"
                    onClick={() => {
                      if (!window.confirm(`要刪除來源「${item.label}」嗎？`)) {
                        return;
                      }

                      startTransition(async () => {
                        setMessage(null);
                        const response = await fetch(`/api/sources/${item.id}`, {
                          method: "DELETE"
                        });
                        const result = await response.json();

                        if (!response.ok) {
                          setMessage(result.message ?? "刪除來源失敗");
                          return;
                        }

                        setItems((current) => current.filter((source) => source.id !== item.id));
                        setMessage(result.message ?? "已刪除來源。");
                      });
                    }}
                  >
                    刪除來源
                  </button>
                </div>
              </div>
            </article>
          ))}
          {items.length === 0 ? (
            <article className="rounded-[1.6rem] border border-dashed border-[var(--border)] p-5 text-sm text-[var(--muted)]">
              目前還沒有來源名單。先加一個 RSS 或公開文章頁。
            </article>
          ) : filteredItems.length === 0 ? (
            <article className="rounded-[1.6rem] border border-dashed border-[var(--border)] p-5 text-sm text-[var(--muted)]">
              目前這個分類下還沒有來源。你可以切回其他分類，或先從 starter packs 加入。
            </article>
          ) : null}
        </div>
      </section>
    </div>
  );
}
