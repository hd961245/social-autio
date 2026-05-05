"use client";

import { useEffect, useState } from "react";

const HEARTBEAT_STORAGE_KEY = "autopilot-heartbeat:last-run";
const HEARTBEAT_INTERVAL_MS = 10 * 60 * 1000;
const HEARTBEAT_THROTTLE_MS = 5 * 60 * 1000;

type HeartbeatState = {
  persona: {
    checked: number;
    created: number;
    skipped: number;
    failed: number;
    paused: boolean;
  };
  sourceRefresh: {
    total: number;
    results: Array<{ id: string; ok: boolean; changed?: boolean }>;
  };
  sourceImports: {
    total: number;
    imported: number;
    results: Array<{ id: string; ok: boolean; imported?: boolean; drafts?: number }>;
  };
  promoted: {
    checked: number;
    promoted: number;
    skipped: number;
    paused: boolean;
  };
  scheduler: {
    processed: number;
    published: number;
    failed: number;
  };
  seo: {
    checked: number;
    handled: number;
    observed: number;
    skipped: number;
    failed: number;
    paused: boolean;
  };
};

export function AutopilotHeartbeat({ compact = false }: { compact?: boolean }) {
  const [message, setMessage] = useState<string>("Autopilot 背景檢查已待命");

  useEffect(() => {
    let disposed = false;

    async function runHeartbeat() {
      try {
        const lastRunRaw = window.localStorage.getItem(HEARTBEAT_STORAGE_KEY);
        const lastRun = lastRunRaw ? Number(lastRunRaw) : 0;
        const now = Date.now();

        if (Number.isFinite(lastRun) && now - lastRun < HEARTBEAT_THROTTLE_MS) {
          return;
        }

        window.localStorage.setItem(HEARTBEAT_STORAGE_KEY, String(now));
        const response = await fetch("/api/autopilot/heartbeat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          }
        });
        const result = await response.json();

        if (disposed) {
          return;
        }

        if (!response.ok) {
          setMessage(result.message ?? "Autopilot 背景檢查失敗");
          return;
        }

        const summary = result.result as HeartbeatState;
        if (summary.persona.paused) {
          setMessage("Autopilot 目前處於暫停狀態");
          return;
        }

        const refreshedSourceCount = summary.sourceRefresh.results.filter((item) => item.ok && item.changed).length;
        const importedSourceCount = summary.sourceImports.imported;
        const createdDraftCount = summary.persona.created;
        const promotedCount = summary.promoted.promoted;
        const publishedCount = summary.scheduler.published;
        const seoHandledCount = summary.seo.handled;
        const failedCount = summary.persona.failed + summary.scheduler.failed + summary.seo.failed;

        if (publishedCount > 0) {
          setMessage(`系統已自動發布 ${publishedCount} 篇排程內容，並持續補跑來源與草稿。`);
          return;
        }

        if (createdDraftCount > 0 || importedSourceCount > 0 || promotedCount > 0 || seoHandledCount > 0) {
          setMessage(
            `系統已自動運轉：刷新 ${refreshedSourceCount} 個來源、匯入 ${importedSourceCount} 則、產文 ${createdDraftCount} 篇、升級排程 ${promotedCount} 篇。`
          );
          return;
        }

        if (failedCount > 0) {
          setMessage(`背景自動化有 ${failedCount} 個失敗項目，建議去 Review / Ops 看例外。`);
          return;
        }

        setMessage(
          `系統已背景檢查 ${summary.persona.checked} 個 persona、${summary.sourceRefresh.total} 個來源與 ${summary.scheduler.processed} 個排程，目前沒有新的到點任務。`
        );
      } catch {
        if (!disposed) {
          setMessage("Autopilot 背景檢查暫時失敗");
        }
      }
    }

    runHeartbeat();
    const timer = window.setInterval(runHeartbeat, HEARTBEAT_INTERVAL_MS);

    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div
      className={
        compact
          ? "rounded-full border border-[var(--border)] bg-white/80 px-4 py-2 text-xs text-[var(--muted)]"
          : "rounded-[1.2rem] border border-[var(--border)] bg-white/80 px-4 py-3 text-sm text-[var(--muted)]"
      }
    >
      {message}
    </div>
  );
}
