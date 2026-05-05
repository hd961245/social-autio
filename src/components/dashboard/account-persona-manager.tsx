"use client";

import { useState } from "react";

type AccountPersona = {
  id: string;
  username: string;
  platform: string;
  personaLabel: string;
  personaPrompt: string;
  defaultTone: string;
  topicFocus: string;
  hookStyle: string;
  ctaStyle: string;
  voiceGuardrails: string;
  autoGenerateEnabled: boolean;
  autoGenerateTime: string;
  autoGenerateMode: "draft" | "scheduled";
  autoGeneratePrompt: string;
  autoGenerateGoal: string;
  lastAutopilotStatus?: string;
  lastAutopilotDetail?: string;
  lastAutopilotAt?: string;
  recommendedScheduleLabel?: string;
  recommendedScheduleDetail?: string;
  learnedFocus: string;
  learnedHook: string;
  learnedCta: string;
  learnedReason: string;
  learnedNextMove: string;
  recentPublishedCount: number;
  recentAverageScore: number;
  autopilotRunCount: number;
  hourlyBars: Array<{
    label: string;
    value: number;
  }>;
};

export function AccountPersonaManager({ accounts }: { accounts: AccountPersona[] }) {
  const [localAccounts, setLocalAccounts] = useState(accounts);
  const [message, setMessage] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<null | { href: string; label: string }>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [openAdvancedIds, setOpenAdvancedIds] = useState<Record<string, boolean>>({});

  function buildPersonaPayload(account: AccountPersona) {
    return {
      personaLabel: account.personaLabel ?? "",
      personaPrompt: account.personaPrompt ?? "",
      defaultTone: account.defaultTone ?? "",
      topicFocus: account.topicFocus ?? "",
      hookStyle: account.hookStyle ?? "",
      ctaStyle: account.ctaStyle ?? "",
      voiceGuardrails: account.voiceGuardrails ?? "",
      autoGenerateEnabled: account.autoGenerateEnabled ?? false,
      autoGenerateTime: account.autoGenerateTime ?? "09:00",
      autoGenerateMode: account.autoGenerateMode ?? "scheduled",
      autoGeneratePrompt: account.autoGeneratePrompt ?? "",
      autoGenerateGoal: account.autoGenerateGoal ?? ""
    };
  }

  async function savePersonaSettings(account: AccountPersona) {
    const response = await fetch(`/api/accounts/${account.id}/persona`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPersonaPayload(account))
    });

    return response.json().then((result) => ({ ok: response.ok, result }));
  }

  return (
    <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Persona Studio</p>
          <h2 className="mt-2 text-3xl font-semibold">把人設收成每日出稿控制台</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
            第一層只留下你每天真的會碰的東西：開關、時間、是否先進總表，以及最近狀態。人設細節收進進階設定，不再讓整頁像表單牆。
          </p>
          <p className="mt-2 max-w-3xl text-xs leading-6 text-[var(--muted)]">
            `儲存並立即生一篇` 會先把目前畫面上的 persona / autopilot 設定存進資料庫，再真的跑一次 AI 自動產文。
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        {localAccounts
          .filter((account) => account.platform === "threads")
          .map((account, index) => {
            const bestHour =
              account.hourlyBars.length > 0
                ? [...account.hourlyBars].sort((left, right) => right.value - left.value)[0] ?? null
                : null;

            return (
              <article key={account.id} className="rounded-[1.6rem] border border-[var(--border)] bg-white/80 p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{account.platform}</p>
                      <h3 className="text-2xl font-semibold">{account.username}</h3>
                      {account.personaLabel ? <span className="pill-tag">{account.personaLabel}</span> : null}
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          account.autoGenerateEnabled ? "bg-emerald-100 text-emerald-700" : "bg-stone-200 text-stone-700"
                        }`}
                      >
                        {account.autoGenerateEnabled ? "Autopilot On" : "Autopilot Off"}
                      </span>
                    </div>

                    <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
                      {account.lastAutopilotDetail || "這個 persona 還沒有自動生文紀錄。先開啟 autopilot 或手動試跑一篇，系統就會開始留下節奏資料。"}
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {[
                        { label: "每天時間", value: account.autoGenerateTime || "09:00", detail: "AI 開始檢查的時間" },
                        { label: "模式", value: account.autoGenerateMode === "scheduled" ? "自動排程" : "進總表待確認", detail: "是否先讓你打勾確認" },
                        { label: "建議時段", value: account.recommendedScheduleLabel || "09:20", detail: "依最近表現推估" },
                        { label: "最近分數", value: String(account.recentAverageScore || 0), detail: "近 18 篇平均表現" }
                      ].map((item) => (
                        <div key={item.label} className="rounded-[1.2rem] border border-[var(--border)] bg-[var(--surface)]/72 px-4 py-4">
                          <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">{item.label}</p>
                          <p className="mt-2 text-2xl font-semibold">{item.value}</p>
                          <p className="mt-1 text-xs text-[var(--muted)]">{item.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <label className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={account.autoGenerateEnabled}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setLocalAccounts((current) =>
                          current.map((item, itemIndex) => (itemIndex === index ? { ...item, autoGenerateEnabled: checked } : item))
                        );
                      }}
                    />
                    啟用每日自動生文
                  </label>
                </div>

                <div className="mt-5 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                  <div className="rounded-[1.4rem] border border-[var(--border)] bg-[var(--surface)]/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">Schedule Read</p>
                        <h4 className="mt-2 text-lg font-semibold">建議時段分佈</h4>
                      </div>
                      <p className="text-sm text-[var(--muted)]">用數字看，不用圖猜</p>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-[1rem] border border-[var(--border)] bg-white px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">最佳時段</p>
                        <p className="mt-2 text-2xl font-semibold">{bestHour?.label ?? "--"}</p>
                      </div>
                      <div className="rounded-[1rem] border border-[var(--border)] bg-white px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">最佳訊號值</p>
                        <p className="mt-2 text-2xl font-semibold">{bestHour?.value ?? 0}</p>
                      </div>
                      <div className="rounded-[1rem] border border-[var(--border)] bg-white px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">可參考時段數</p>
                        <p className="mt-2 text-2xl font-semibold">{account.hourlyBars.length}</p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm text-[var(--muted)]">{account.recommendedScheduleDetail ?? "目前資料還不夠，先用保守預設時段。"}</p>
                  </div>

                  <div className="rounded-[1.4rem] border border-[var(--border)] bg-[var(--surface)]/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">Autopilot Numbers</p>
                        <h4 className="mt-2 text-lg font-semibold">最近運行概況</h4>
                      </div>
                      <p className="text-sm text-[var(--muted)]">
                        {account.lastAutopilotAt ? `最後一次 ${account.lastAutopilotAt}` : "尚未試跑"}
                      </p>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-[1rem] border border-[var(--border)] bg-white px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">Runs</p>
                        <p className="mt-2 text-2xl font-semibold">{account.autopilotRunCount}</p>
                      </div>
                      <div className="rounded-[1rem] border border-[var(--border)] bg-white px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">Posts</p>
                        <p className="mt-2 text-2xl font-semibold">{account.recentPublishedCount}</p>
                      </div>
                      <div className="rounded-[1rem] border border-[var(--border)] bg-white px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">Score</p>
                        <p className="mt-2 text-2xl font-semibold">{account.recentAverageScore}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-[1.4rem] border border-[var(--border)] bg-[var(--surface)]/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">Learning Update</p>
                      <h4 className="mt-2 text-lg font-semibold">這條線最近自動學到了什麼</h4>
                    </div>
                    <p className="text-sm text-[var(--muted)]">會直接回灌到下一輪 autopilot</p>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <div className="rounded-[1rem] border border-[var(--border)] bg-white px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">題目焦點</p>
                      <p className="mt-2 text-sm leading-7">{account.learnedFocus}</p>
                    </div>
                    <div className="rounded-[1rem] border border-[var(--border)] bg-white px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">Hook 調整</p>
                      <p className="mt-2 text-sm leading-7">{account.learnedHook}</p>
                    </div>
                    <div className="rounded-[1rem] border border-[var(--border)] bg-white px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">CTA 調整</p>
                      <p className="mt-2 text-sm leading-7">{account.learnedCta}</p>
                    </div>
                    <div className="rounded-[1rem] border border-[var(--border)] bg-white px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">下一輪優先</p>
                      <p className="mt-2 text-sm leading-7">{account.learnedNextMove}</p>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-7 text-[var(--muted)]">{account.learnedReason}</p>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[0.8fr_0.8fr_1.4fr]">
                  <label className="rounded-[1.25rem] border border-[var(--border)] bg-white p-4">
                    <span className="mb-2 block text-sm text-[var(--muted)]">每天時間</span>
                    <input
                      type="time"
                      className="w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3 outline-none"
                      value={account.autoGenerateTime}
                      onChange={(event) => {
                        const value = event.target.value || "09:00";
                        setLocalAccounts((current) =>
                          current.map((item, itemIndex) => (itemIndex === index ? { ...item, autoGenerateTime: value } : item))
                        );
                      }}
                    />
                  </label>

                  <label className="rounded-[1.25rem] border border-[var(--border)] bg-white p-4">
                    <span className="mb-2 block text-sm text-[var(--muted)]">產出模式</span>
                    <select
                      className="w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3 outline-none"
                      value={account.autoGenerateMode}
                      onChange={(event) => {
                        const value = event.target.value as "draft" | "scheduled";
                        setLocalAccounts((current) =>
                          current.map((item, itemIndex) => (itemIndex === index ? { ...item, autoGenerateMode: value } : item))
                        );
                      }}
                    >
                      <option value="draft">先進總表待確認</option>
                      <option value="scheduled">直接排程發布</option>
                    </select>
                    <p className="mt-2 text-xs leading-6 text-[var(--muted)]">
                      建議先用「進總表待確認」，每天進來勾選後直接發，會更符合你的工作流。
                    </p>
                  </label>

                  <div className="rounded-[1.25rem] border border-[var(--border)] bg-white p-4">
                    <span className="mb-2 block text-sm text-[var(--muted)]">最近狀態</span>
                    <p className="text-base font-medium text-[var(--foreground)]">
                      {account.lastAutopilotStatus ? `${account.lastAutopilotStatus} · ${account.lastAutopilotAt || "剛剛"}` : "尚未有最近狀態"}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                      {account.lastAutopilotDetail || "等第一篇自動生文跑完，這裡就會顯示最新結果。"}
                    </p>
                  </div>
                </div>

                <details
                  open={openAdvancedIds[account.id] ?? false}
                  onToggle={(event) => {
                    const nextOpen = (event.currentTarget as HTMLDetailsElement).open;
                    setOpenAdvancedIds((current) => ({
                      ...current,
                      [account.id]: nextOpen
                    }));
                  }}
                  className="mt-5 rounded-[1.4rem] border border-[var(--border)] bg-[var(--surface)]/70 p-4"
                >
                  <summary className="cursor-pointer list-none text-base font-medium">
                    進階 persona 設定
                    <span className="ml-3 text-sm text-[var(--muted)]">只有這個 persona 要偏離站台方向時，再打開調整</span>
                  </summary>

                  <div className="mt-4 grid gap-4 lg:grid-cols-[0.8fr_0.8fr_1.4fr]">
                    <label className="rounded-[1.25rem] border border-[var(--border)] bg-white p-4">
                      <span className="mb-2 block text-sm text-[var(--muted)]">人設名稱</span>
                      <input
                        className="w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3 outline-none"
                        placeholder="例如：冷靜創業觀察者"
                        value={account.personaLabel}
                        onChange={(event) => {
                          const value = event.target.value;
                          setLocalAccounts((current) =>
                            current.map((item, itemIndex) => (itemIndex === index ? { ...item, personaLabel: value } : item))
                          );
                        }}
                      />
                    </label>

                    <label className="rounded-[1.25rem] border border-[var(--border)] bg-white p-4">
                      <span className="mb-2 block text-sm text-[var(--muted)]">預設語氣</span>
                      <select
                        className="w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3 outline-none"
                        value={account.defaultTone}
                        onChange={(event) => {
                          const value = event.target.value;
                          setLocalAccounts((current) =>
                            current.map((item, itemIndex) => (itemIndex === index ? { ...item, defaultTone: value } : item))
                          );
                        }}
                      >
                        <option value="">沿用全域預設</option>
                        <option value="sharp-observer">Sharp Observer</option>
                        <option value="mystic-guide">Mystic Guide</option>
                        <option value="founder-journal">Founder Journal</option>
                      </select>
                    </label>

                    <label className="rounded-[1.25rem] border border-[var(--border)] bg-white p-4">
                      <span className="mb-2 block text-sm text-[var(--muted)]">人設基底</span>
                      <textarea
                        className="min-h-32 w-full resize-none rounded-2xl border border-[var(--border)] bg-transparent p-4 outline-none"
                        placeholder="描述這個帳號像誰、講話節奏、立場、會用什麼角度切題。"
                        value={account.personaPrompt}
                        onChange={(event) => {
                          const value = event.target.value;
                          setLocalAccounts((current) =>
                            current.map((item, itemIndex) => (itemIndex === index ? { ...item, personaPrompt: value } : item))
                          );
                        }}
                      />
                    </label>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <label className="rounded-[1.25rem] border border-[var(--border)] bg-white p-4">
                      <span className="mb-2 block text-sm text-[var(--muted)]">題材範圍</span>
                      <textarea
                        className="min-h-24 w-full resize-none rounded-2xl border border-[var(--border)] bg-transparent p-4 outline-none"
                        placeholder="這個 persona 平常適合談什麼，不適合談什麼。"
                        value={account.topicFocus}
                        onChange={(event) => {
                          const value = event.target.value;
                          setLocalAccounts((current) =>
                            current.map((item, itemIndex) => (itemIndex === index ? { ...item, topicFocus: value } : item))
                          );
                        }}
                      />
                    </label>

                    <label className="rounded-[1.25rem] border border-[var(--border)] bg-white p-4">
                      <span className="mb-2 block text-sm text-[var(--muted)]">Hook 風格</span>
                      <textarea
                        className="min-h-24 w-full resize-none rounded-2xl border border-[var(--border)] bg-transparent p-4 outline-none"
                        placeholder="例如：先講結論、反直覺句、創業者視角切入。"
                        value={account.hookStyle}
                        onChange={(event) => {
                          const value = event.target.value;
                          setLocalAccounts((current) =>
                            current.map((item, itemIndex) => (itemIndex === index ? { ...item, hookStyle: value } : item))
                          );
                        }}
                      />
                    </label>

                    <label className="rounded-[1.25rem] border border-[var(--border)] bg-white p-4">
                      <span className="mb-2 block text-sm text-[var(--muted)]">CTA 風格</span>
                      <textarea
                        className="min-h-24 w-full resize-none rounded-2xl border border-[var(--border)] bg-transparent p-4 outline-none"
                        placeholder="例如：偏討論、偏導流、偏追蹤、偏收藏。"
                        value={account.ctaStyle}
                        onChange={(event) => {
                          const value = event.target.value;
                          setLocalAccounts((current) =>
                            current.map((item, itemIndex) => (itemIndex === index ? { ...item, ctaStyle: value } : item))
                          );
                        }}
                      />
                    </label>

                    <label className="rounded-[1.25rem] border border-[var(--border)] bg-white p-4">
                      <span className="mb-2 block text-sm text-[var(--muted)]">語氣禁區</span>
                      <textarea
                        className="min-h-24 w-full resize-none rounded-2xl border border-[var(--border)] bg-transparent p-4 outline-none"
                        placeholder="例如：不要雞湯、不要太油、不要硬賣、不要像公告文。"
                        value={account.voiceGuardrails}
                        onChange={(event) => {
                          const value = event.target.value;
                          setLocalAccounts((current) =>
                            current.map((item, itemIndex) => (itemIndex === index ? { ...item, voiceGuardrails: value } : item))
                          );
                        }}
                      />
                    </label>

                    <label className="rounded-[1.25rem] border border-[var(--border)] bg-white p-4">
                      <span className="mb-2 block text-sm text-[var(--muted)]">每日方向覆蓋</span>
                      <textarea
                        className="min-h-24 w-full resize-none rounded-2xl border border-[var(--border)] bg-transparent p-4 outline-none"
                        placeholder="留白就沿用上方的站台方向；只有這個 persona 想走不同切角時再填。"
                        value={account.autoGeneratePrompt}
                        onChange={(event) => {
                          const value = event.target.value;
                          setLocalAccounts((current) =>
                            current.map((item, itemIndex) => (itemIndex === index ? { ...item, autoGeneratePrompt: value } : item))
                          );
                        }}
                      />
                    </label>

                    <label className="rounded-[1.25rem] border border-[var(--border)] bg-white p-4">
                      <span className="mb-2 block text-sm text-[var(--muted)]">目標覆蓋</span>
                      <textarea
                        className="min-h-24 w-full resize-none rounded-2xl border border-[var(--border)] bg-transparent p-4 outline-none"
                        placeholder="留白就沿用站台目標；只有這個 persona 想追不同結果時再填。"
                        value={account.autoGenerateGoal}
                        onChange={(event) => {
                          const value = event.target.value;
                          setLocalAccounts((current) =>
                            current.map((item, itemIndex) => (itemIndex === index ? { ...item, autoGenerateGoal: value } : item))
                          );
                        }}
                      />
                    </label>
                  </div>
                </details>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={Boolean(busyKey)}
                    className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm text-white disabled:opacity-60"
                    onClick={async () => {
                      setBusyKey(`save:${account.id}`);
                      setMessage(null);
                      setLastAction(null);

                      try {
                        const { ok, result } = await savePersonaSettings(localAccounts[index] ?? account);
                        setMessage(ok ? `已更新 ${account.username} 的設定。` : result.message ?? "更新失敗");
                      } catch (error) {
                        setMessage(error instanceof Error ? error.message : "更新失敗");
                      } finally {
                        setBusyKey(null);
                      }
                    }}
                  >
                    {busyKey === `save:${account.id}` ? "儲存中..." : "儲存設定"}
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(busyKey)}
                    className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm disabled:opacity-60"
                    onClick={async () => {
                      setBusyKey(`run:${account.id}`);
                      setMessage(null);
                      setLastAction(null);

                      try {
                        const currentAccount = localAccounts[index] ?? account;
                        const saved = await savePersonaSettings(currentAccount);

                        if (!saved.ok) {
                          setMessage(saved.result.message ?? "儲存 autopilot 設定失敗");
                          return;
                        }

                        const response = await fetch(`/api/accounts/${account.id}/autopilot`, {
                          method: "POST"
                        });
                        const result = await response.json();

                        if (!response.ok) {
                          setMessage(result.message ?? "立即試跑失敗");
                          return;
                        }

                        const nowLabel = new Date().toLocaleString("zh-TW", { hour12: false });
                        setLocalAccounts((current) =>
                          current.map((item) =>
                            item.id === account.id
                              ? {
                                  ...item,
                                  lastAutopilotStatus: result.result?.postStatus ?? "draft",
                                  lastAutopilotDetail:
                                    result.result?.postStatus === "scheduled"
                                      ? `已立即試跑 AI 自動生文，並排進 ${result.result?.scheduledForLabel ?? "即刻"} 的發文佇列。Provider: ${result.result?.provider ?? "auto"}`
                                      : `已立即試跑 AI 自動生文，並補了 ${result.result?.createdCount ?? 1} 篇候選稿到總表。Provider: ${result.result?.provider ?? "auto"}`,
                                  lastAutopilotAt: nowLabel,
                                  autopilotRunCount: item.autopilotRunCount + (result.result?.createdCount ?? 1)
                                }
                              : item
                          )
                        );
                        setMessage(
                          result.result?.postStatus === "scheduled"
                            ? `已替 ${account.username} 產出一篇文，並排進 ${result.result?.scheduledForLabel ?? "即刻"} 的佇列。`
                            : `已替 ${account.username} 補了 ${result.result?.createdCount ?? 1} 篇候選稿到總表。`
                        );
                        if (result.result?.postStatus === "scheduled") {
                          setLastAction({
                            href: "/desk?tab=queue",
                            label: "去 Queue 看排程"
                          });
                        } else if (result.result?.postId) {
                          setLastAction({
                            href: `/review/${result.result.postId}`,
                            label: "進這篇 Threads 確認區"
                          });
                        } else if (result.result?.createdCount) {
                          setLastAction({
                            href: "/desk?tab=queue",
                            label: "去 Queue 看候選稿"
                          });
                        }
                      } catch (error) {
                        setMessage(error instanceof Error ? error.message : "立即試跑失敗");
                      } finally {
                        setBusyKey(null);
                      }
                    }}
                  >
                    {busyKey === `run:${account.id}` ? "AI 產文中..." : "儲存並立即生一篇"}
                  </button>
                  <a href={`/compose?accountId=${account.id}`} className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm">
                    用這個帳號開稿
                  </a>
                </div>
              </article>
            );
          })}

        {localAccounts.filter((account) => account.platform === "threads").length === 0 ? (
          <article className="rounded-[1.6rem] border border-dashed border-[var(--border)] p-5 text-sm text-[var(--muted)]">
            目前還沒有 Threads 帳號。先完成授權，之後每個帳號都可以有自己的語氣和人設。
          </article>
        ) : null}
      </div>

      {message ? (
        <div className="mt-4 space-y-2 text-sm text-[var(--muted)]">
          <p>{message}</p>
          {lastAction ? (
            <a href={lastAction.href} className="inline-flex font-medium text-[var(--accent)] underline underline-offset-4">
              {lastAction.label}
            </a>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
