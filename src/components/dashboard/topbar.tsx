export function Topbar() {
  return (
    <header className="glass-panel soft-grid overflow-hidden rounded-[2rem] border border-[var(--border)] px-6 py-5 fade-in-up">
      <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-[var(--muted)]">Operations Workspace</p>
          <h2 className="mt-2 text-3xl font-semibold">Threads publishing, monitoring, and response control</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1.2rem] border border-[var(--border)] bg-white/60 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.25em] text-[var(--muted)]">Deploy</p>
            <p className="mt-1 text-sm font-semibold">Zeabur Preview</p>
          </div>
          <div className="rounded-[1.2rem] border border-[var(--border)] bg-white/60 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.25em] text-[var(--muted)]">OAuth</p>
            <p className="mt-1 text-sm font-semibold">Threads Connected Flow</p>
          </div>
          <div className="rounded-[1.2rem] border border-[var(--border)] bg-[var(--card-dark)] px-4 py-3 text-white">
            <p className="text-[11px] uppercase tracking-[0.25em] text-white/60">Focus</p>
            <p className="mt-1 text-sm font-semibold">MVP Phase 1</p>
          </div>
        </div>
      </div>
    </header>
  );
}

