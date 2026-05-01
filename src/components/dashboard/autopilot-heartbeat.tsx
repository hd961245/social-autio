"use client";

import { useEffect, useState } from "react";

const HEARTBEAT_STORAGE_KEY = "autopilot-heartbeat:last-run";
const HEARTBEAT_INTERVAL_MS = 10 * 60 * 1000;
const HEARTBEAT_THROTTLE_MS = 5 * 60 * 1000;

type HeartbeatState = {
  checked: number;
  created: number;
  skipped: number;
  failed: number;
  paused: boolean;
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
        if (summary.paused) {
          setMessage("Autopilot 目前處於暫停狀態");
          return;
        }

        if (summary.created > 0) {
          setMessage(`Autopilot 已自動補跑，新增 ${summary.created} 篇今日候選稿`);
          return;
        }

        if (summary.failed > 0) {
          setMessage(`Autopilot 背景檢查完成，但有 ${summary.failed} 個 persona 失敗`);
          return;
        }

        setMessage(`Autopilot 已背景檢查 ${summary.checked} 個 persona，目前沒有新的到點內容`);
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
