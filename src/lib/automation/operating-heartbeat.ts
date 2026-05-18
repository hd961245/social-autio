import { runDailyPersonaAutopilot } from "@/lib/automation/daily-persona";
import { runAutoPromoteDirectDrafts } from "@/lib/automation/flywheel";
import { runSeoOpportunityAutopilot } from "@/lib/automation/seo-opportunity";
import { runScheduledPosts } from "@/lib/scheduler/engine";
import { refreshAllSourceWatches, runDailySourceImports } from "@/lib/sources-service";

type SafeResult<T> = { ok: true; value: T } | { ok: false; error: string };

async function safe<T>(fn: () => Promise<T>): Promise<SafeResult<T>> {
  try {
    return { ok: true, value: await fn() };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "unknown error" };
  }
}

export type OperatingHeartbeatResult = {
  persona: SafeResult<Awaited<ReturnType<typeof runDailyPersonaAutopilot>>>;
  sourceRefresh: SafeResult<Awaited<ReturnType<typeof refreshAllSourceWatches>>>;
  sourceImports: SafeResult<Awaited<ReturnType<typeof runDailySourceImports>>>;
  promoted: SafeResult<Awaited<ReturnType<typeof runAutoPromoteDirectDrafts>>>;
  scheduler: SafeResult<Awaited<ReturnType<typeof runScheduledPosts>>>;
  seo: SafeResult<Awaited<ReturnType<typeof runSeoOpportunityAutopilot>>>;
};

export async function runOperatingHeartbeat(): Promise<OperatingHeartbeatResult> {
  const sourceRefresh = await safe(() => refreshAllSourceWatches());
  const sourceImports = await safe(() => runDailySourceImports());
  const persona = await safe(() => runDailyPersonaAutopilot());
  const promoted = await safe(() => runAutoPromoteDirectDrafts());
  const scheduler = await safe(() => runScheduledPosts());
  const seo = await safe(() => runSeoOpportunityAutopilot());

  return {
    persona,
    sourceRefresh,
    sourceImports,
    promoted,
    scheduler,
    seo
  };
}
