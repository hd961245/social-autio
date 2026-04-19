import { PageIntro } from "@/components/dashboard/page-intro";
import { SourceWatchlist } from "@/components/dashboard/source-watchlist";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  let items: Awaited<ReturnType<typeof prisma.sourceWatch.findMany>> = [];

  try {
    items = await prisma.sourceWatch.findMany({
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }]
    });
  } catch {}

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Sources"
        title="來源觀察清單"
        description="把你固定會看的 RSS、部落格或文章頁收進來。先刷新、再挑內容改寫，不需要每天重貼同一批來源。"
      />
      <SourceWatchlist
        initialItems={items.map((item) => ({
          id: item.id,
          label: item.label,
          sourceType: item.sourceType as "rss" | "url",
          sourceUrl: item.sourceUrl,
          isActive: item.isActive,
          autoImportEnabled: item.autoImportEnabled,
          preferredOutcome: item.preferredOutcome === "wordpress" ? "wordpress" : "threads",
          lastFetchedAt: item.lastFetchedAt?.toLocaleString("zh-TW", { hour12: false }) ?? "尚未刷新",
          lastItemTitle: item.lastItemTitle ?? "",
          lastItemUrl: item.lastItemUrl ?? "",
          lastExcerpt: item.lastExcerpt ?? "",
          lastHandledStatus: (item.lastHandledStatus as "new" | "imported" | "skipped" | null) ?? "new",
          lastError: item.lastError ?? ""
        }))}
      />
    </div>
  );
}
