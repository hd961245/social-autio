import { PageIntro } from "@/components/dashboard/page-intro";
import { helpTopics, type HelpTopic } from "@/lib/help-center";

export const dynamic = "force-dynamic";

export default async function HelpPage({
  searchParams
}: {
  searchParams?: Promise<{ topic?: HelpTopic }>;
}) {
  const params = await searchParams;
  const selectedTopic = params?.topic && params.topic in helpTopics ? params.topic : "ai-workflow";
  const current = helpTopics[selectedTopic as HelpTopic];

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Help Center"
        title="工作流說明中心"
        description="把 AI、發文、素材拆解和 WordPress 草稿的操作邏輯集中在這裡。功能頁只保留工作區，需要時再打開說明。"
      />

      <section className="grid gap-4 xl:grid-cols-[280px_1fr]">
        <aside className="glass-panel rounded-[2rem] border border-[var(--border)] p-5">
          <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">Topics</p>
          <div className="mt-4 space-y-2">
            {(Object.entries(helpTopics) as Array<[HelpTopic, (typeof helpTopics)[HelpTopic]]>).map(([key, topic]) => {
              const active = key === selectedTopic;
              return (
                <a
                  key={key}
                  href={`/help?topic=${key}`}
                  className={`block rounded-[1.2rem] px-4 py-3 text-sm ${
                    active ? "bg-[var(--card-dark)] text-white" : "border border-[var(--border)] bg-white/78"
                  }`}
                >
                  <span className="block font-semibold">{topic.title}</span>
                  <span className={`mt-1 block text-xs ${active ? "text-white/65" : "text-[var(--muted)]"}`}>{topic.summary}</span>
                </a>
              );
            })}
          </div>
        </aside>

        <div className="space-y-4">
          {current.sections.map((section) => (
            <article key={section.title} className="glass-panel rounded-[2rem] border border-[var(--border)] p-6">
              <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">{current.title}</p>
              <h2 className="mt-3 text-2xl font-semibold">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{section.description}</p>
              <div className="mt-5 grid gap-3">
                {section.bullets.map((bullet) => (
                  <div key={bullet} className="rounded-[1.2rem] border border-[var(--border)] bg-white/78 px-4 py-3 text-sm leading-7">
                    {bullet}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
