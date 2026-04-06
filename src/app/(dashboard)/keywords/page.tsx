import { KeywordTable } from "@/components/dashboard/keyword-table";
import { PageIntro } from "@/components/dashboard/page-intro";
import { getKeywordHitSummaries } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function KeywordsPage() {
  const hits = await getKeywordHitSummaries();

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Keywords"
        title="關鍵字監控"
        description="目前先顯示命中紀錄。下一輪會補關鍵字 CRUD、掃描 job 與快速回應動作。"
      />
      <KeywordTable hits={hits} />
    </div>
  );
}
