import type { KeywordHitSummary } from "@/lib/dashboard-data";

export function KeywordTable({ hits }: { hits: KeywordHitSummary[] }) {
  return (
    <section className="glass-panel fade-in-up rounded-[2rem] border border-[var(--border)] p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Keyword Monitor</p>
          <h2 className="mt-2 text-3xl font-semibold">近期命中</h2>
        </div>
        <button className="rounded-full border border-[var(--border-strong)] bg-white/70 px-4 py-2 text-sm">
          管理關鍵字
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-3xl border border-[var(--border)] bg-white/65">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-white/70 text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Keyword</th>
              <th className="px-4 py-3 font-medium">Author</th>
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {hits.map((hit) => (
              <tr key={hit.id} className="border-t border-[var(--border)]">
                <td className="px-4 py-4">
                  <p className="font-medium">{hit.keyword}</p>
                  <p className="mt-1 text-[var(--muted)]">{hit.excerpt}</p>
                </td>
                <td className="px-4 py-4">{hit.author}</td>
                <td className="px-4 py-4">{hit.matchedAt}</td>
                <td className="px-4 py-4 capitalize">
                  <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs text-[var(--accent-strong)]">
                    {hit.actionTaken}
                  </span>
                </td>
              </tr>
            ))}
            {hits.length === 0 ? (
              <tr className="border-t border-[var(--border)]">
                <td colSpan={4} className="px-4 py-8 text-center text-[var(--muted)]">
                  尚未有關鍵字命中資料
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
