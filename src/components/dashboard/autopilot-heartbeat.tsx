"use client";

import { useEffect, useState } from "react";

const HEARTBEAT_STORAGE_KEY = "autopilot-heartbeat:last-run";
const HEARTBEAT_INTERVAL_MS = 15 * 60 * 1000;
const HEARTBEAT_THROTTLE_MS = 2 * 60 * 1000;

type RuntimeStatus = {
  ok: boolean;
  latestHeartbeat: {
    status: "executed" | "failed";
    detail: string | null;
    executedAt: string;
  } | null;
  latestScheduler: {
    status: "executed" | "failed";
    detail: string | null;
    executedAt: string;
  } | null;
  latestFailure: {
    actionType: string;
    detail: string | null;
    executedAt: string;
  } | null;
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
          method: "GET",
          cache: "no-store"
        });
        const result = (await response.json()) as RuntimeStatus;

        if (disposed) {
          return;
        }

        if (!response.ok) {
          setMessage("Autopilot 狀態讀取失敗");
          return;
        }

        if (!result.latestHeartbeat && !result.latestScheduler) {
          setMessage("還沒有看到背景自動化執行紀錄，請確認 Inngest / cron 是否已接通。");
          return;
        }

        if (result.latestFailure) {
          setMessage(`最近一次失敗來自 ${result.latestFailure.actionType}，建議去 Factory / Ops 看詳細原因。`);
          return;
        }

        if (result.latestScheduler?.status === "executed") {
          const timeLabel = new Date(result.latestScheduler.executedAt).toLocaleString("zh-TW", { hour12: false });
          setMessage(`排程引擎最近一次執行於 ${timeLabel}，目前前台只讀狀態，不會再額外觸發重任務。`);
          return;
        }

        const heartbeatTime = result.latestHeartbeat
          ? new Date(result.latestHeartbeat.executedAt).toLocaleString("zh-TW", { hour12: false })
          : "未知";
        setMessage(`背景自動化最後回報於 ${heartbeatTime}，目前由 Inngest / cron 持續接手，不依賴頁面常駐觸發。`);
      } catch {
        if (!disposed) {
          setMessage("Autopilot 狀態讀取暫時失敗");
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
