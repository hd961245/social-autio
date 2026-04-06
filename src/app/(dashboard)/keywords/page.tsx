import { KeywordsManager } from "@/components/dashboard/keywords-manager";
import { KeywordTable } from "@/components/dashboard/keyword-table";
import { PageIntro } from "@/components/dashboard/page-intro";
import { getKeywordHitSummaries } from "@/lib/dashboard-data";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function KeywordsPage() {
  const [hits, keywords] = await Promise.all([
    getKeywordHitSummaries(),
    prisma.keyword.findMany({
      orderBy: {
        createdAt: "desc"
      }
    })
  ]);

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Keywords"
        title="關鍵字監控"
        description="目前先顯示命中紀錄。下一輪會補關鍵字 CRUD、掃描 job 與快速回應動作。"
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
