import { PageIntro } from "@/components/dashboard/page-intro";
import { MetricsChart } from "@/components/dashboard/metrics-chart";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Analytics"
        title="帳號健康監控"
        description="目前先提供帳號層級的趨勢視圖與後續規劃提示。等 insights collector 接上後，這裡會變成真正的分析工作面。"
      />
      <MetricsChart />
      <section className="grid gap-4 lg:grid-cols-3">
        {[
          ["Insights API", "下一步直接接 user-level metrics 與 post-level metrics 快照。"],
          ["Quota Tracking", "補上每天可用發文額度與已使用量。"],
          ["Alert Layer", "token 即將到期、sync 失敗、API error 會在這裡集中顯示。"]
        ].map(([title, body]) => (
          <article key={title} className="glass-panel rounded-[1.6rem] border border-[var(--border)] p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">{title}</p>
            <p className="mt-3 text-sm leading-7">{body}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
