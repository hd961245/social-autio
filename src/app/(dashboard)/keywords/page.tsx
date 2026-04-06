import { KeywordsManager } from "@/components/dashboard/keywords-manager";
import { KeywordTable } from "@/components/dashboard/keyword-table";
import { PageIntro } from "@/components/dashboard/page-intro";
import { getKeywordHitSummaries } from "@/lib/dashboard-data";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function KeywordsPage() {
  let hits = await getKeywordHitSummaries();
  let keywords: Awaited<ReturnType<typeof prisma.keyword.findMany>> = [];

  try {
    keywords = await prisma.keyword.findMany({
      orderBy: {
        createdAt: "desc"
      }
    });
  } catch {
    hits = [];
  }

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Keywords"
        title="關鍵字監控"
        description="現在會掃描自有 Threads 貼文的回覆樹，命中後可手動快速回覆，也能交給自動化規則接手。"
      />
      <KeywordsManager
        initialKeywords={keywords.map((keyword) => ({
          id: keyword.id,
          keyword: keyword.keyword,
          matchMode: keyword.matchMode,
          isActive: keyword.isActive
        }))}
      />
      <KeywordTable hits={hits} />
    </div>
  );
}
