import { ContentEngineForm } from "@/components/dashboard/content-engine-form";
import { HelpSheet } from "@/components/dashboard/help-sheet";
import { PageIntro } from "@/components/dashboard/page-intro";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function FactoryPage() {
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
        eyebrow="Content Factory"
        title="AI 寫文工廠"
        description="這裡統一處理來源轉稿、YouTube / transcript ingestion、persona autopilot 前置素材，以及長文擴寫原料。Compose 只保留最後確認與送出。"
        action={
          <div className="flex flex-wrap gap-3">
            <HelpSheet topic="content-engine" buttonLabel="查看工廠說明" />
            <a href="/compose" className="rounded-full border border-[var(--border)] bg-white/80 px-4 py-2 text-sm">
              直接去 Compose
            </a>
          </div>
        }
      />

      <section className="grid gap-4 xl:grid-cols-3">
        {[
          { label: "來源轉稿", detail: "文章 / 新聞 / Threads / YouTube / transcript 先正規化，再拆成 Threads / WordPress 草稿。" },
          { label: "persona autopilot 原料", detail: "站台 mission、來源路徑、高可寫題目、留言洞察，都先在這裡變成 AI 可用上下文。" },
          { label: "長文擴寫供應鏈", detail: "把強表現 Threads、研究站長文、YouTube transcript 收成後續 WordPress 草稿素材。" }
        ].map((card) => (
          <article key={card.label} className="glass-panel rounded-[1.8rem] border border-[var(--border)] p-5">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">{card.label}</p>
            <p className="mt-3 text-sm leading-7 text-[var(--foreground)]">{card.detail}</p>
          </article>
        ))}
      </section>

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
          href: draft.account.platform === "threads" ? `/review/${draft.id}` : `/compose?postId=${draft.id}`
        }))}
      />
    </div>
  );
}
