import { QuickCompose } from "@/components/dashboard/quick-compose";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const fmt = (d: Date | null | undefined) => {
  if (!d) return "—";
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(d);
};

const num = (n: number | null | undefined) =>
  n == null ? "—" : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

export default async function DeskPage() {
  const now = new Date();

  const [upcoming, published, snapshot, account] = await Promise.all([
    prisma.post.findMany({
      where: { scheduledAt: { gte: now }, status: "scheduled" },
      orderBy: { scheduledAt: "asc" },
      take: 10,
      select: { id: true, scheduledAt: true, textContent: true }
    }),
    prisma.post.findMany({
      where: { status: "published" },
      orderBy: { publishedAt: "desc" },
      take: 15,
      select: {
        id: true,
        publishedAt: true,
        textContent: true,
        metrics: {
          orderBy: { capturedAt: "desc" },
          take: 1,
          select: { views: true, likes: true, replies: true, reposts: true }
        }
      }
    }),
    prisma.metricsSnapshot.findFirst({
      orderBy: { capturedAt: "desc" },
      select: {
        followerCount: true,
        totalViews: true,
        totalLikes: true,
        totalReplies: true,
        capturedAt: true
      }
    }),
    prisma.platformAccount.findFirst({
      where: { platform: "threads", isActive: true },
      select: { platformUsername: true }
    })
  ]);

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-12 text-sm">
      {/* header */}
      <div>
        <p className="text-xs text-zinc-500 mb-1 font-mono">
          @{account?.platformUsername ?? "—"}
        </p>
        <h1 className="text-lg font-semibold">數據看板</h1>
      </div>

      {/* account stats */}
      <section>
        <h2 className="section-label">帳號整體數據</h2>
        {snapshot ? (
          <>
            <div className="grid grid-cols-4 gap-3 font-mono">
              {[
                { label: "追蹤者", val: num(snapshot.followerCount) },
                { label: "累計瀏覽", val: num(snapshot.totalViews) },
                { label: "累計按讚", val: num(snapshot.totalLikes) },
                { label: "累計留言", val: num(snapshot.totalReplies) }
              ].map(({ label, val }) => (
                <div key={label} className="border border-zinc-800 rounded-sm p-3">
                  <div className="text-base font-bold">{val}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">{label}</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-zinc-700 mt-2 font-mono">
              更新於 {fmt(snapshot.capturedAt)}
            </p>
          </>
        ) : (
          <p className="text-zinc-600">尚無帳號數據（發文後等 metrics cron 跑一次）</p>
        )}
      </section>

      {/* upcoming schedule */}
      <section>
        <h2 className="section-label">排程貼文</h2>
        {upcoming.length === 0 ? (
          <p className="text-zinc-600">目前沒有排程貼文</p>
        ) : (
          <table className="w-full text-left font-mono">
            <thead>
              <tr className="border-b border-zinc-800 text-xs text-zinc-500">
                <th className="pb-2 pr-6 font-normal w-28">時間（台灣）</th>
                <th className="pb-2 font-normal">內容</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map((p) => (
                <tr key={p.id} className="border-b border-zinc-900">
                  <td className="py-2 pr-6 text-zinc-400 whitespace-nowrap text-xs">
                    {fmt(p.scheduledAt)}
                  </td>
                  <td className="py-2 text-zinc-300 text-xs">
                    {p.textContent?.replace(/\n+/g, " ").slice(0, 70)}
                    {(p.textContent?.length ?? 0) > 70 ? "…" : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* published post metrics */}
      <section>
        <h2 className="section-label">近期貼文成效</h2>
        {published.length === 0 ? (
          <p className="text-zinc-600">尚無已發貼文</p>
        ) : (
          <table className="w-full text-left font-mono">
            <thead>
              <tr className="border-b border-zinc-800 text-xs text-zinc-500">
                <th className="pb-2 pr-4 font-normal w-24">發文時間</th>
                <th className="pb-2 pr-4 font-normal">內容</th>
                <th className="pb-2 pr-3 font-normal text-right">瀏覽</th>
                <th className="pb-2 pr-3 font-normal text-right">讚</th>
                <th className="pb-2 pr-3 font-normal text-right">留言</th>
                <th className="pb-2 font-normal text-right">轉發</th>
              </tr>
            </thead>
            <tbody>
              {published.map((p) => {
                const m = p.metrics[0];
                return (
                  <tr key={p.id} className="border-b border-zinc-900">
                    <td className="py-2 pr-4 text-zinc-500 whitespace-nowrap text-xs">
                      {fmt(p.publishedAt)}
                    </td>
                    <td className="py-2 pr-4 text-zinc-300 text-xs max-w-[180px] truncate">
                      {p.textContent?.replace(/\n+/g, " ").slice(0, 35)}…
                    </td>
                    <td className="py-2 pr-3 text-right text-xs">{num(m?.views)}</td>
                    <td className="py-2 pr-3 text-right text-xs">{num(m?.likes)}</td>
                    <td className="py-2 pr-3 text-right text-xs">{num(m?.replies)}</td>
                    <td className="py-2 text-right text-xs">{num(m?.reposts)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* quick compose */}
      <section>
        <h2 className="section-label">新增草稿</h2>
        <QuickCompose />
      </section>
    </div>
  );
}
