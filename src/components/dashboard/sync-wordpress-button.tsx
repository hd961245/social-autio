"use client";

import { useState } from "react";

export function SyncWordPressButton({ postId }: { postId: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [draftHref, setDraftHref] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={busy}
        className="rounded-full bg-[var(--card-dark)] px-4 py-2 text-sm text-white disabled:opacity-60"
        onClick={async () => {
          try {
            setBusy(true);
            setMessage(null);
            setDraftHref(null);
            const response = await fetch(`/api/posts/${postId}/sync-wordpress`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({})
            });
            const result = await response.json();

            if (!response.ok) {
              setMessage(result.message ?? "建立 WordPress 草稿失敗");
              return;
            }

            setMessage(result.message ?? "已建立 WordPress 草稿。");
            if (result.postId) {
              setDraftHref(`/compose?postId=${result.postId}`);
            }
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "擴寫中..." : "擴寫成長文"}
      </button>
      {message ? (
        <div className="text-sm text-[var(--muted)]">
          <p>{message}</p>
          {draftHref ? (
            <a href={draftHref} className="inline-flex font-medium text-[var(--accent)] underline underline-offset-4">
              打開 WordPress 草稿
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
