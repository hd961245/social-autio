import { PageIntro } from "@/components/dashboard/page-intro";
import { SourceInbox } from "@/components/dashboard/source-inbox";
import { scoreSourceItem } from "@/lib/content/source-inbox";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  let items: Awaited<ReturnType<typeof prisma.sourceWatch.findMany>> = [];

  try {
    items = await prisma.sourceWatch.findMany({
      where: {
        isActive: true,
        lastItemTitle: {
          not: null
        }
      },
      orderBy: [{ lastFetchedAt: "desc" }, { updatedAt: "desc" }]
    });
  } catch {}

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Inbox"
        title="來源收件匣"
        description="把各來源最新抓到的內容集中看，不用逐一翻來源名單。這裡會先幫你判斷更適合改寫成 Threads 還是 WordPress。"
      />
      <SourceInbox
        initialItems={items.map((item) => {
          const score = scoreSourceItem({
            title: item.lastItemTitle ?? "",
            excerpt: item.lastExcerpt ?? "",
            sourceType: item.sourceType,
            importCount: item.importCount,
            skipCount: item.skipCount,
            threadsPickCount: item.threadsPickCount,
            wordpressPickCount: item.wordpressPickCount
          });

          return {
            id: item.id,
            label: item.label,
            sourceType: item.sourceType as "rss" | "url",
            lastFetchedAt: item.lastFetchedAt?.toLocaleString("zh-TW", { hour12: false }) ?? "尚未刷新",
            title: item.lastItemTitle ?? "未命名來源內容",
            url: item.lastItemUrl ?? item.sourceUrl,
            excerpt: item.lastExcerpt ?? "",
            status: (item.lastHandledStatus as "new" | "imported" | "skipped" | null) ?? "new",
            threadsScore: score.threadsScore,
            wordpressScore: score.wordpressScore,
            commercialScore: score.commercialScore,
            recommendation: score.recommendation,
            reasons: score.reasons,
            memoryNote: score.memoryNote
          };
        })}
      />
    </div>
  );
}
