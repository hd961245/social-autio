"use client";

import { useMemo, useState } from "react";
import { helpTopics, type HelpTopic } from "@/lib/help-center";

export function HelpSheet({
  topic,
  buttonLabel = "查看說明",
  buttonVariant = "secondary"
}: {
  topic: HelpTopic;
  buttonLabel?: string;
  buttonVariant?: "primary" | "secondary";
}) {
  const [open, setOpen] = useState(false);
  const content = useMemo(() => helpTopics[topic], [topic]);

  return (
    <>
      <button
        type="button"
        className={
          buttonVariant === "primary"
            ? "rounded-full bg-[var(--card-dark)] px-4 py-2 text-sm text-white"
            : "rounded-full border border-[var(--border)] bg-white/80 px-4 py-2 text-sm text-[var(--foreground)]"
        }
        onClick={() => setOpen(true)}
      >
        {buttonLabel}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[100] flex items-stretch justify-end bg-[rgba(22,18,15,0.36)] p-3 md:p-6">
          <div className="flex h-full w-full max-w-[560px] flex-col overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--card-strong)] shadow-[0_30px_80px_rgba(0,0,0,0.18)]">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">Help Sheet</p>
                <h2 className="mt-2 text-2xl font-semibold">{content.title}</h2>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{content.summary}</p>
              </div>
              <button
                type="button"
                className="rounded-full border border-[var(--border)] bg-white px-3 py-2 text-sm"
                onClick={() => setOpen(false)}
              >
                關閉
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto px-6 py-6">
              {content.sections.map((section) => (
                <section key={section.title} className="rounded-[1.4rem] border border-[var(--border)] bg-white/72 p-5">
                  <h3 className="text-lg font-semibold">{section.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{section.description}</p>
                  <ul className="mt-4 space-y-2 text-sm leading-7 text-[var(--foreground)]">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="rounded-[1rem] bg-[var(--accent-soft)]/60 px-3 py-2">
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            <div className="border-t border-[var(--border)] px-6 py-4 text-sm text-[var(--muted)]">
              想看完整整理版，可以打開 <a className="font-medium text-[var(--accent)]" href={`/help?topic=${topic}`}>說明中心</a>。
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
