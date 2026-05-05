import { runDailyPersonaAutopilot } from "@/lib/automation/daily-persona";
import { runAutoPromoteDirectDrafts } from "@/lib/automation/flywheel";
import { runSeoOpportunityAutopilot } from "@/lib/automation/seo-opportunity";
import { runScheduledPosts } from "@/lib/scheduler/engine";
import { refreshAllSourceWatches, runDailySourceImports } from "@/lib/sources-service";

export type OperatingHeartbeatResult = {
  persona: Awaited<ReturnType<typeof runDailyPersonaAutopilot>>;
  sourceRefresh: Awaited<ReturnType<typeof refreshAllSourceWatches>>;
  sourceImports: Awaited<ReturnType<typeof runDailySourceImports>>;
  promoted: Awaited<ReturnType<typeof runAutoPromoteDirectDrafts>>;
  scheduler: Awaited<ReturnType<typeof runScheduledPosts>>;
  seo: Awaited<ReturnType<typeof runSeoOpportunityAutopilot>>;
};

export async function runOperatingHeartbeat(): Promise<OperatingHeartbeatResult> {
  const sourceRefresh = await refreshAllSourceWatches();
  const sourceImports = await runDailySourceImports();
  const persona = await runDailyPersonaAutopilot();
  const promoted = await runAutoPromoteDirectDrafts();
  const scheduler = await runScheduledPosts();
  const seo = await runSeoOpportunityAutopilot();

  return {
    persona,
    sourceRefresh,
    sourceImports,
    promoted,
    scheduler,
    seo
  };
}
