"use client";

import { useState } from "react";

type Props = {
  page: string;
  query?: string;
  lane: "refresh" | "expand" | "capture";
  confidence: "high" | "medium" | "low";
  reason: string;
  action: string;
};

export function SeoOpportunityDraftButton({ page, query, lane, confidence, reason, action }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [href, setHref] = useState<string | null>(null);
  const [linkLabel, setLinkLabel] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={busy}
        className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium disabled:opacity-60"
        onClick={async () => {
          try {
            setBusy(true);
            setMessage(null);
            setHref(null);
            const response = await fetch("/api/seo/opportunity-draft", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                page,
                query,
                lane,
                confidence,
                reason,
                action
              })
            });
            const result = await response.json();

            if (!response.ok) {
              setMessage(result.message ?? "建立 SEO 優化稿失敗");
              return;
            }

            setMessage(result.message ?? "已建立 WordPress SEO 優化稿。");
            if (result.href) {
              setHref(result.href);
              setLinkLabel(
                result.route === "published"
                  ? "看 WordPress 結果"
                  : result.route === "review"
                    ? "去 Review 看待拍板"
                    : result.route === "observed"
                      ? "回 Analytics 觀察"
                      : "打開 WordPress 草稿"
              );
            }
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "處理中..." : confidence === "high" ? "自動處理 SEO 稿" : "建立 WP 優化稿"}
      </button>
      {message ? (
        <div className="text-sm text-[var(--muted)]">
          <p>{message}</p>
          {href ? (
            <a href={href} className="inline-flex font-medium text-[var(--accent)] underline underline-offset-4">
              {linkLabel ?? "打開 WordPress 草稿"}
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
