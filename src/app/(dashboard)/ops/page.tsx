import { PageIntro } from "@/components/dashboard/page-intro";
import { getOpsDiagnostics } from "@/lib/ops-diagnostics";

export const dynamic = "force-dynamic";

export default async function OpsPage() {
  const diagnostics = await getOpsDiagnostics();

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Ops"
        title="環境診斷台"
        description="這裡專門用來確認目前這份 app 到底連的是哪個環境、哪些關鍵變數有沒有設、以及帳號資料是不是像你預期。"
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "DB", value: diagnostics.database.ready ? "Ready" : "Down", detail: diagnostics.database.detail },
          { label: "Threads Accounts", value: String(diagnostics.records.threadsAccounts), detail: "目前資料庫中的 Threads 帳號數" },
          { label: "WordPress Sites", value: String(diagnostics.records.wordpressAccounts), detail: "目前資料庫中的 WordPress 站台數" },
          { label: "Tracked Sources", value: String(diagnostics.records.sourceWatches), detail: "目前資料庫中的來源追蹤數" }
        ].map((item) => (
          <article key={item.label} className="glass-panel rounded-[1.75rem] border border-[var(--border)] p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">{item.label}</p>
            <p className="mt-4 text-5xl font-semibold leading-none">{item.value}</p>
            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{item.detail}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "AI Health",
            value: diagnostics.aiHealth.gemini.ok ? "Ready" : "Check",
            detail: diagnostics.aiHealth.gemini.message
          },
          {
            label: "Gemini Model",
            value: diagnostics.aiHealth.gemini.model ?? "n/a",
            detail: diagnostics.aiHealth.gemini.latencyMs ? `${diagnostics.aiHealth.gemini.latencyMs}ms` : "尚未量到延遲"
          },
          {
            label: "OpenAI",
            value: diagnostics.aiHealth.configured.openai ? "Configured" : "Missing",
            detail: "目前是否有 OPENAI_API_KEY"
          },
          {
            label: "Schema",
            value: diagnostics.schema.looksDrifted ? "Drifted" : "Aligned",
            detail: diagnostics.schema.detail
          }
        ].map((item) => (
          <article key={item.label} className="glass-panel rounded-[1.75rem] border border-[var(--border)] p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">{item.label}</p>
            <p className="mt-4 text-3xl font-semibold leading-none">{item.value}</p>
            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{item.detail}</p>
          </article>
        ))}
      </section>

      <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
        <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Schema Checks</p>
        <h2 className="mt-2 text-3xl font-semibold">資料庫欄位抽查</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {diagnostics.schema.checks.map((check) => (
            <article key={check.column} className="rounded-[1.5rem] border border-[var(--border)] bg-white/75 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{check.column}</p>
                <span
                  className={`rounded-full px-3 py-1 text-xs ${
                    check.status === "present"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {check.status}
                </span>
              </div>
            </article>
          ))}
          {diagnostics.schema.checks.length === 0 ? (
            <article className="rounded-[1.5rem] border border-[var(--border)] bg-white/75 p-4 text-sm text-[var(--muted)]">
              目前沒有可用的 schema 抽查結果。
            </article>
          ) : null}
        </div>
      </section>

      <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
        <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Environment Checks</p>
        <h2 className="mt-2 text-3xl font-semibold">關鍵環境變數</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {diagnostics.envChecks.map((check) => (
            <article key={check.key} className="rounded-[1.5rem] border border-[var(--border)] bg-white/75 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{check.key}</p>
                <span
                  className={`rounded-full px-3 py-1 text-xs ${
                    check.status === "present"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {check.status}
                </span>
              </div>
              <p className="mt-3 text-sm text-[var(--muted)]">{check.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
        <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Warnings</p>
        <h2 className="mt-2 text-3xl font-semibold">目前觀察</h2>
        <div className="mt-6 space-y-3">
          {diagnostics.warnings.map((warning) => (
            <article key={warning} className="rounded-[1.4rem] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              {warning}
            </article>
          ))}
          {diagnostics.warnings.length === 0 ? (
            <article className="rounded-[1.4rem] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              目前沒有明顯異常。若你仍覺得資料不對，優先確認是不是看錯 Zeabur project / environment。
            </article>
          ) : null}
        </div>
      </section>

      <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
        <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Recovery Hints</p>
        <h2 className="mt-2 text-3xl font-semibold">下一步建議</h2>
        <div className="mt-6 space-y-3">
          {diagnostics.hints.map((hint) => (
            <article key={hint} className="rounded-[1.4rem] border border-[var(--border)] bg-white/75 p-4 text-sm text-[var(--foreground)]">
              {hint}
            </article>
          ))}
          {diagnostics.hints.length === 0 ? (
            <article className="rounded-[1.4rem] border border-[var(--border)] bg-white/75 p-4 text-sm text-[var(--muted)]">
              目前沒有特別需要處理的異常建議。
            </article>
          ) : null}
        </div>
      </section>

      <section className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
        <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Threads Callback</p>
        <h2 className="mt-2 text-3xl font-semibold">最近授權寫庫紀錄</h2>
        <div className="mt-6 space-y-3">
          {diagnostics.threadsCallbackLogs.map((log) => (
            <article key={log.id} className="rounded-[1.4rem] border border-[var(--border)] bg-white/75 p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{log.executedAt}</p>
                <span
                  className={`rounded-full px-3 py-1 text-xs ${
                    log.status === "executed" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {log.status}
                </span>
              </div>
              <p className="mt-3 text-[var(--muted)]">{log.detail}</p>
            </article>
          ))}
          {diagnostics.threadsCallbackLogs.length === 0 ? (
            <article className="rounded-[1.4rem] border border-[var(--border)] bg-white/75 p-4 text-sm text-[var(--muted)]">
              目前還沒有 Threads callback 記錄。你下一次重新授權後，這裡會直接顯示 profile id、username 與是否寫入成功。
            </article>
          ) : null}
        </div>
      </section>
    </div>
  );
}
