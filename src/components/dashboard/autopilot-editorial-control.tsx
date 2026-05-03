"use client";

import { useMemo, useState } from "react";

const AUTOPILOT_MODES = [
  {
    value: "review_only",
    label: "只進待拍板",
    detail: "所有 AI 產物一律先進 Review，不自動排程。"
  },
  {
    value: "auto_schedule",
    label: "強稿自動排程",
    detail: "高信心稿可直接排程，其餘仍進 Review。"
  },
  {
    value: "near_full_auto",
    label: "近乎全自動",
    detail: "優先自動找題、自動產稿、自動排程，只把例外留給你。"
  }
] as const;

type AutopilotMode = (typeof AUTOPILOT_MODES)[number]["value"];

function toDateInputValue(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

export function AutopilotEditorialControl({
  initialDirection,
  initialGoal,
  initialMissionTitle,
  initialMissionCurrentValue,
  initialMissionTargetValue,
  initialMissionUnit,
  initialMissionDeadline,
  initialAutopilotMode,
  initialAutomationPaused
}: {
  initialDirection: string;
  initialGoal: string;
  initialMissionTitle: string;
  initialMissionCurrentValue: number | null;
  initialMissionTargetValue: number | null;
  initialMissionUnit: string;
  initialMissionDeadline: string | null;
  initialAutopilotMode: AutopilotMode;
  initialAutomationPaused: boolean;
}) {
  const [missionTitle, setMissionTitle] = useState(initialMissionTitle);
  const [missionCurrentValue, setMissionCurrentValue] = useState(
    initialMissionCurrentValue === null ? "" : String(initialMissionCurrentValue)
  );
  const [missionTargetValue, setMissionTargetValue] = useState(
    initialMissionTargetValue === null ? "" : String(initialMissionTargetValue)
  );
  const [missionUnit, setMissionUnit] = useState(initialMissionUnit);
  const [missionDeadline, setMissionDeadline] = useState(toDateInputValue(initialMissionDeadline));
  const [direction, setDirection] = useState(initialDirection);
  const [goal, setGoal] = useState(initialGoal);
  const [autopilotMode, setAutopilotMode] = useState<AutopilotMode>(initialAutopilotMode);
  const [automationPaused, setAutomationPaused] = useState(initialAutomationPaused);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"neutral" | "error">("neutral");
  const [isSaving, setIsSaving] = useState(false);

  const progress = useMemo(() => {
    const current = Number(missionCurrentValue);
    const target = Number(missionTargetValue);
    if (!Number.isFinite(current) || !Number.isFinite(target) || target <= 0) {
      return null;
    }
    return Math.min(100, Math.round((current / target) * 1000) / 10);
  }, [missionCurrentValue, missionTargetValue]);

  async function saveSettings() {
    setIsSaving(true);
    setMessage(null);
    setMessageTone("neutral");

    const currentValue = missionCurrentValue.trim() === "" ? null : Number(missionCurrentValue);
    const targetValue = missionTargetValue.trim() === "" ? null : Number(missionTargetValue);

    if (
      (missionCurrentValue.trim() !== "" && !Number.isFinite(currentValue)) ||
      (missionTargetValue.trim() !== "" && !Number.isFinite(targetValue))
    ) {
      setMessage("Mission 數字欄位請填有效整數。");
      setMessageTone("error");
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/automation/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          automationPaused,
          missionTitle,
          missionCurrentValue: currentValue,
          missionTargetValue: targetValue,
          missionUnit,
          missionDeadline: missionDeadline ? new Date(`${missionDeadline}T00:00:00+08:00`).toISOString() : null,
          autopilotMode,
          editorialDirection: direction,
          editorialGoal: goal
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message ?? "站台設定更新失敗");
      }

      setMessage("PM Ops mission 與自動化模式已更新。");
      setMessageTone("neutral");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "站台設定更新失敗");
      setMessageTone("error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-[1.6rem] border border-[var(--border)] bg-white/80 p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">PM Mission</p>
          <h3 className="mt-2 text-2xl font-semibold">先定經營目標，再讓 AI 照這個方向自己跑</h3>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
            這裡是站台層的總任務。你在這裡定 mission、方向與自動化等級，下面各 persona 再負責各自語氣與每日節奏。
          </p>
        </div>
        <div className="rounded-[1.3rem] border border-[var(--border)] bg-[var(--surface)]/70 px-5 py-4">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">目前進度</p>
          <p className="mt-2 text-3xl font-semibold">
            {missionCurrentValue || "0"}
            <span className="text-base font-medium text-[var(--muted)]"> / {missionTargetValue || "?"}</span>
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {progress !== null ? `${progress}% · ${missionUnit || "目標"}` : missionUnit || "目標"}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="rounded-[1.25rem] border border-[var(--border)] bg-[var(--surface)]/70 p-4 lg:col-span-2">
              <span className="mb-2 block text-sm text-[var(--muted)]">當前 Mission</span>
              <input
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none"
                placeholder="例如：進入台灣理財關鍵字前 10 名，建立可持續的 Threads → WordPress 飛輪"
                value={missionTitle}
                onChange={(event) => setMissionTitle(event.target.value)}
              />
            </label>
            <label className="rounded-[1.25rem] border border-[var(--border)] bg-[var(--surface)]/70 p-4">
              <span className="mb-2 block text-sm text-[var(--muted)]">目前值</span>
              <input
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none"
                inputMode="numeric"
                placeholder="778"
                value={missionCurrentValue}
                onChange={(event) => setMissionCurrentValue(event.target.value)}
              />
            </label>
            <label className="rounded-[1.25rem] border border-[var(--border)] bg-[var(--surface)]/70 p-4">
              <span className="mb-2 block text-sm text-[var(--muted)]">目標值</span>
              <input
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none"
                inputMode="numeric"
                placeholder="30000"
                value={missionTargetValue}
                onChange={(event) => setMissionTargetValue(event.target.value)}
              />
            </label>
            <label className="rounded-[1.25rem] border border-[var(--border)] bg-[var(--surface)]/70 p-4">
              <span className="mb-2 block text-sm text-[var(--muted)]">單位</span>
              <input
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none"
                placeholder="月點擊"
                value={missionUnit}
                onChange={(event) => setMissionUnit(event.target.value)}
              />
            </label>
            <label className="rounded-[1.25rem] border border-[var(--border)] bg-[var(--surface)]/70 p-4">
              <span className="mb-2 block text-sm text-[var(--muted)]">目標期限</span>
              <input
                type="date"
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none"
                value={missionDeadline}
                onChange={(event) => setMissionDeadline(event.target.value)}
              />
            </label>
          </div>

          <label className="rounded-[1.25rem] border border-[var(--border)] bg-[var(--surface)]/70 p-4">
            <span className="mb-2 block text-sm text-[var(--muted)]">站台級內容方向</span>
            <textarea
              className="min-h-28 w-full resize-none rounded-2xl border border-[var(--border)] bg-white p-4 outline-none"
              placeholder="例如：以台美股、利率、ETF、理財新手決策為主，優先處理能直接幫讀者做決定的題目。"
              value={direction}
              onChange={(event) => setDirection(event.target.value)}
            />
          </label>

          <label className="rounded-[1.25rem] border border-[var(--border)] bg-[var(--surface)]/70 p-4">
            <span className="mb-2 block text-sm text-[var(--muted)]">這一階段希望達成的結果</span>
            <textarea
              className="min-h-24 w-full resize-none rounded-2xl border border-[var(--border)] bg-white p-4 outline-none"
              placeholder="例如：提高留言與收藏、把 Threads 強文沉成 WordPress 草稿、建立可被轉述的 CTA 節奏。"
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
            />
          </label>
        </div>

        <div className="space-y-4">
          <article className="rounded-[1.25rem] border border-[var(--border)] bg-[var(--surface)]/70 p-4">
            <p className="text-sm font-medium">站台自動化等級</p>
            <div className="mt-3 space-y-3">
              {AUTOPILOT_MODES.map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  className={`w-full rounded-[1.2rem] border px-4 py-3 text-left ${
                    autopilotMode === mode.value
                      ? "border-[var(--card-dark)] bg-[var(--card-dark)] text-white"
                      : "border-[var(--border)] bg-white text-[var(--foreground)]"
                  }`}
                  onClick={() => setAutopilotMode(mode.value)}
                >
                  <span className="block text-sm font-semibold">{mode.label}</span>
                  <span className={`mt-1 block text-xs ${autopilotMode === mode.value ? "text-white/70" : "text-[var(--muted)]"}`}>
                    {mode.detail}
                  </span>
                </button>
              ))}
            </div>
          </article>

          <article className="rounded-[1.25rem] border border-[var(--border)] bg-[var(--surface)]/70 p-4">
            <p className="text-sm font-medium">人工 override</p>
            <div className="mt-3 space-y-3">
              <button
                type="button"
                className={`w-full rounded-[1.2rem] border px-4 py-3 text-left ${
                  automationPaused
                    ? "border-rose-300 bg-rose-50 text-rose-700"
                    : "border-[var(--border)] bg-white text-[var(--foreground)]"
                }`}
                onClick={() => setAutomationPaused((value) => !value)}
              >
                <span className="block text-sm font-semibold">{automationPaused ? "目前已暫停 autopilot" : "目前允許 autopilot 自動運轉"}</span>
                <span className={`mt-1 block text-xs ${automationPaused ? "text-rose-600" : "text-[var(--muted)]"}`}>
                  {automationPaused ? "解除後，排程與站內 heartbeat 會重新補跑。" : "如果今天只想人工決策，可以先切成暫停。"}
                </span>
              </button>
              <div className="rounded-[1.1rem] border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--muted)]">
                建議預設用 `近乎全自動`，但當來源品質不穩、AI provider 異常、或你正在切題材時，先切成 `只進待拍板`。
              </div>
            </div>
          </article>

          <div className="rounded-[1.25rem] border border-[var(--border)] bg-[rgba(255,252,248,0.86)] px-4 py-4 text-sm leading-7 text-[var(--muted)]">
            <p className="font-medium text-[var(--foreground)]">這裡的設定會直接影響：</p>
            <ul className="mt-2 space-y-1">
              <li>1. PM Ops 首頁的 mission 與今日優先級</li>
              <li>2. autopilot 每天優先吃哪些來源與題材</li>
              <li>3. AI 產稿後是直接排程，還是先進 Review</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={isSaving}
          className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm text-white disabled:opacity-60"
          onClick={saveSettings}
        >
          {isSaving ? "儲存中..." : "儲存 PM Ops 設定"}
        </button>
        <p className="text-sm text-[var(--muted)]">這裡是站台層控制台。persona 沒寫自己的每日方向時，會先沿用這裡。</p>
      </div>

      {message ? (
        <p className={`mt-4 text-sm ${messageTone === "error" ? "text-[var(--danger)]" : "text-[var(--muted)]"}`}>{message}</p>
      ) : null}
    </section>
  );
}
