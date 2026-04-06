import { mockTrend } from "@/lib/mock-data";

export function MetricsChart() {
  const maxFollowers = Math.max(...mockTrend.map((item) => item.followers));
  const maxEngagement = Math.max(...mockTrend.map((item) => item.engagement));

  return (
    <section className="glass-panel fade-in-up rounded-[2rem] border border-[var(--border)] p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Health Monitor</p>
          <h2 className="mt-2 text-3xl font-semibold">近 7 日帳號趨勢</h2>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-[var(--accent-strong)]">Followers</span>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">Engagement</span>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        {mockTrend.map((item) => (
          <div key={item.day} className="grid grid-cols-[56px_1fr_1fr] items-center gap-4 text-sm">
            <span className="text-[var(--muted)]">{item.day}</span>
            <div className="rounded-full bg-white/80 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
              <div
                className="h-3 rounded-full bg-[var(--accent)]"
                style={{ width: `${(item.followers / maxFollowers) * 100}%` }}
              />
            </div>
            <div className="rounded-full bg-white/80 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
              <div
                className="h-3 rounded-full bg-[var(--success)]"
                style={{ width: `${(item.engagement / maxEngagement) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
