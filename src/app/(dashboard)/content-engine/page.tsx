import { ContentEngineForm } from "@/components/dashboard/content-engine-form";
import { PageIntro } from "@/components/dashboard/page-intro";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ContentEnginePage() {
  let settings: Awaited<ReturnType<typeof prisma.appSettings.findFirst>> = null;
  let ingestions: Awaited<ReturnType<typeof prisma.ingestionRecord.findMany>> = [];
  let drafts: Array<
    Awaited<ReturnType<typeof prisma.post.findMany<{ include: { account: true } }>>>[number]
  > = [];

  try {
    [settings, ingestions, drafts] = await Promise.all([
      prisma.appSettings.findFirst(),
      prisma.ingestionRecord.findMany({
        orderBy: { createdAt: "desc" },
        take: 6
      }),
      prisma.post.findMany({
        where: { status: "draft" },
        include: { account: true },
        orderBy: { createdAt: "desc" },
        take: 8
      })
    ]);
  } catch {}

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Content Engine"
        title="AI 內容大腦"
        description="丟進網址、文本或截圖素材，先用 persona 視角拆成 Threads 與 WordPress 草稿，人工審稿後再排程。"
      />

      <ContentEngineForm
        initialPersonaPrompt={settings?.globalPersonaPrompt ?? "像一位冷靜但有觀點的內容策略師，幫我把素材整理成可發佈版本。"}
        initialTone={settings?.defaultTone ?? "sharp-observer"}
        recentIngestions={ingestions.map((item) => ({
          id: item.id,
          sourceType: item.sourceType,
          title: item.title ?? "未命名素材",
          createdAt: item.createdAt.toLocaleString("zh-TW", { hour12: false }),
          generatedCount: item.generatedPostIds ? (JSON.parse(item.generatedPostIds) as string[]).length : 0
        }))}
        recentDrafts={drafts.map((draft) => ({
          id: draft.id,
          platform: draft.account.platform,
          title: draft.title ?? draft.textContent ?? "未命名草稿",
          status: draft.status
        }))}
      />
    </div>
  );
}
