"use client";

import { useState, useTransition } from "react";

type SiteOption = {
  id: string;
  siteUrl: string;
  username: string;
};

export function WordPressStyleProfileCard({
  sites,
  initialWritingStyleProfile,
  initialAffiliateLinkPolicy
}: {
  sites: SiteOption[];
  initialWritingStyleProfile: string;
  initialAffiliateLinkPolicy: string;
}) {
  const [selectedSiteId, setSelectedSiteId] = useState(sites[0]?.id ?? "");
  const [sampleSize, setSampleSize] = useState("12");
  const [useAllPosts, setUseAllPosts] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [writingStyleProfile, setWritingStyleProfile] = useState(initialWritingStyleProfile);
  const [affiliateLinkPolicy, setAffiliateLinkPolicy] = useState(initialAffiliateLinkPolicy);
  const [isPending, startTransition] = useTransition();

  return (
    <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Writing DNA</p>
          <h2 className="mt-2 text-3xl font-semibold">從你的舊文學風格</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
            讀取你自己的 WordPress 舊文章，整理成一份後續生成草稿都會沿用的寫作方式，並額外保留聯盟連結與推廣段落的規劃。
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_180px_180px_auto]">
        <label className="rounded-3xl bg-white/85 p-4">
          <span className="mb-2 block text-sm text-[var(--muted)]">分析站台</span>
          <select
            className="w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3 outline-none"
            value={selectedSiteId}
            onChange={(event) => setSelectedSiteId(event.target.value)}
            disabled={!sites.length}
          >
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.siteUrl} @{site.username}
              </option>
            ))}
          </select>
        </label>
        <label className="rounded-3xl bg-white/85 p-4">
          <span className="mb-2 block text-sm text-[var(--muted)]">取樣篇數</span>
          <input
            className="w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3 outline-none"
            inputMode="numeric"
            value={sampleSize}
            onChange={(event) => setSampleSize(event.target.value.replace(/[^\d]/g, "").slice(0, 2))}
            disabled={useAllPosts}
          />
        </label>
        <label className="rounded-3xl bg-white/85 p-4">
          <span className="mb-2 block text-sm text-[var(--muted)]">分析範圍</span>
          <select
            className="w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3 outline-none"
            value={useAllPosts ? "all" : "sample"}
            onChange={(event) => setUseAllPosts(event.target.value === "all")}
          >
            <option value="all">全部文章</option>
            <option value="sample">指定篇數</option>
          </select>
        </label>
        <div className="flex items-end">
          <button
            disabled={!selectedSiteId || isPending}
            className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm text-white disabled:opacity-60"
            onClick={() =>
              startTransition(async () => {
                setMessage(null);

                const response = await fetch("/api/wordpress/style-profile", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    accountId: selectedSiteId,
                    sampleSize: Number(sampleSize) || 12,
                    useAllPosts
                  })
                });

                const result = await response.json();

                if (!response.ok) {
                  setMessage(result.message ?? "分析失敗");
                  return;
                }

                setWritingStyleProfile(result.writingStyleProfile ?? "");
                setAffiliateLinkPolicy(result.affiliateLinkPolicy ?? "");
                setMessage(result.message ?? "已更新你的寫作方式設定。");
              })
            }
          >
            {isPending ? "分析中..." : "分析我的舊文"}
          </button>
        </div>
      </div>

      {message ? <p className="mt-4 text-sm text-[var(--muted)]">{message}</p> : null}

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <article className="rounded-[1.6rem] border border-[var(--border)] bg-white/75 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Writing Style Profile</p>
          <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--foreground)]">
            {writingStyleProfile || "尚未建立。先選一個站台，讓系統從你的舊文章整理出寫作習慣。"}
          </div>
        </article>
        <article className="rounded-[1.6rem] border border-[var(--border)] bg-white/75 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Affiliate / Promo Planning</p>
          <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--foreground)]">
            {affiliateLinkPolicy || "尚未建立。分析完成後，這裡會保留你在聯盟連結、導購段落與 CTA 的使用規劃。"}
          </div>
        </article>
      </div>
    </section>
  );
}
