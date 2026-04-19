import { ContentEngineForm } from "@/components/dashboard/content-engine-form";
import { HelpSheet } from "@/components/dashboard/help-sheet";
import { PageIntro } from "@/components/dashboard/page-intro";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ContentEnginePage() {
  let settings: Awaited<ReturnType<typeof prisma.appSettings.findFirst>> = null;
  let ingestions: Awaited<ReturnType<typeof prisma.ingestionRecord.findMany>> = [];
  let threadsAccounts: Awaited<ReturnType<typeof prisma.platformAccount.findMany>> = [];
  let drafts: Array<
    Awaited<ReturnType<typeof prisma.post.findMany<{ include: { account: true } }>>>[number]
  > = [];

  try {
    [settings, ingestions, drafts, threadsAccounts] = await Promise.all([
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
      }),
      prisma.platformAccount.findMany({
        where: { platform: "threads", isActive: true },
        orderBy: [{ isActive: "desc" }, { createdAt: "asc" }]
      })
    ]);
  } catch {}

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Content Engine"
        title="AI 素材拆稿台"
        description="這頁專門處理『先吃素材，再拆成草稿』。如果你只是想快速起一版文案，直接去 Compose 會更快。"
        action={
          <div className="flex flex-wrap gap-3">
            <HelpSheet topic="content-engine" buttonLabel="查看這頁說明" />
            <a href="/help?topic=ai-workflow" className="rounded-full border border-[var(--border)] bg-white/80 px-4 py-2 text-sm">
              打開 AI 工作流
            </a>
          </div>
        }
      />

      <ContentEngineForm
        initialPersonaPrompt={settings?.globalPersonaPrompt ?? "像一位冷靜但有觀點的內容策略師，幫我把素材整理成可發佈版本。"}
        initialTone={settings?.defaultTone ?? "sharp-observer"}
        initialAiProvider={(settings?.aiProvider as "auto" | "gemini" | "claude" | "openai" | undefined) ?? "auto"}
        threadsAccounts={threadsAccounts.map((account) => ({
          id: account.id,
          username: `@${account.platformUsername}`,
          personaLabel: account.personaLabel ?? "",
          personaPrompt: account.personaPrompt ?? "",
          defaultTone: account.defaultTone ?? "",
          topicFocus: account.topicFocus ?? "",
          hookStyle: account.hookStyle ?? "",
          ctaStyle: account.ctaStyle ?? "",
          voiceGuardrails: account.voiceGuardrails ?? ""
        }))}
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
          status: draft.status,
          href: `/compose?postId=${draft.id}`
        }))}
      />
    </div>
  );
}
