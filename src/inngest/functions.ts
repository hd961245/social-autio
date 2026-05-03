import { cron } from "inngest";
import { inngest } from "@/inngest/client";
import { evaluateAutomationRules } from "@/lib/automation/rules-engine";
import { runDailyPersonaAutopilot } from "@/lib/automation/daily-persona";
import { scanKeywordMatches } from "@/lib/keywords/monitor";
import { collectMetricsSnapshots, refreshExpiringTokens } from "@/lib/metrics-service";
import { runScheduledPosts } from "@/lib/scheduler/engine";
import { refreshAllSourceWatches, runDailySourceImports } from "@/lib/sources-service";
import { runAutoPromoteDirectDrafts, runAutoWordPressExpansion, runOptimizationFlywheel } from "@/lib/automation/flywheel";

export const schedulerFunction = inngest.createFunction(
  { id: "publish-scheduled-posts", retries: 1, triggers: [cron("* * * * *")] },
  async ({ step }) => {
    return step.run("publish-due-posts", async () => runScheduledPosts());
  }
);

export const metricsFunction = inngest.createFunction(
  { id: "collect-metrics-and-refresh-tokens", retries: 1, triggers: [cron("0 */6 * * *")] },
  async ({ step }) => {
    const metrics = await step.run("collect-metrics", async () => collectMetricsSnapshots());
    const tokenRefresh = await step.run("refresh-expiring-tokens", async () => refreshExpiringTokens());

    return {
      metrics,
      tokenRefresh
    };
  }
);

export const keywordScanFunction = inngest.createFunction(
  { id: "scan-keyword-matches", retries: 1, triggers: [cron("*/30 * * * *")] },
  async ({ step }) => {
    return step.run("scan-keywords", async () => scanKeywordMatches());
  }
);

export const automationFunction = inngest.createFunction(
  { id: "evaluate-automation-rules", retries: 1, triggers: [cron("*/30 * * * *")] },
  async ({ step }) => {
    return step.run("evaluate-automation", async () => evaluateAutomationRules());
  }
);

export const sourceWatchRefreshFunction = inngest.createFunction(
  { id: "refresh-source-watchlist", retries: 1, triggers: [cron("0 */3 * * *")] },
  async ({ step }) => {
    return step.run("refresh-sources", async () => refreshAllSourceWatches());
  }
);

export const dailySourceImportFunction = inngest.createFunction(
  { id: "daily-source-imports", retries: 1, triggers: [cron("0 0 * * *")] },
  async ({ step }) => {
    return step.run("daily-import-sources", async () => runDailySourceImports());
  }
);

export const dailyPersonaAutopilotFunction = inngest.createFunction(
  { id: "daily-persona-autopilot", retries: 1, triggers: [cron("*/15 * * * *")] },
  async ({ step }) => {
    return step.run("generate-daily-persona-posts", async () => runDailyPersonaAutopilot());
  }
);

export const optimizationFlywheelFunction = inngest.createFunction(
  { id: "optimization-flywheel", retries: 1, triggers: [cron("15 1 * * *")] },
  async ({ step }) => {
    const optimization = await step.run("generate-optimization-drafts", async () => runOptimizationFlywheel());
    const wordpress = await step.run("auto-wordpress-expansion", async () => runAutoWordPressExpansion());

    return {
      optimization,
      wordpress
    };
  }
);

export const autoPromoteDraftsFunction = inngest.createFunction(
  { id: "auto-promote-direct-drafts", retries: 1, triggers: [cron("*/20 * * * *")] },
  async ({ step }) => {
    const result = await step.run("promote-high-confidence-drafts", async () => runAutoPromoteDirectDrafts());

    return result;
  }
);

export const inngestFunctions = [
  schedulerFunction,
  metricsFunction,
  keywordScanFunction,
  automationFunction,
  autoPromoteDraftsFunction,
  sourceWatchRefreshFunction,
  dailySourceImportFunction,
  dailyPersonaAutopilotFunction,
  optimizationFlywheelFunction
];
