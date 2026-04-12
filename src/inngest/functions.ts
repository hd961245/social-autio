import { cron } from "inngest";
import { inngest } from "@/inngest/client";
import { evaluateAutomationRules } from "@/lib/automation/rules-engine";
import { scanKeywordMatches } from "@/lib/keywords/monitor";
import { collectMetricsSnapshots, refreshExpiringTokens } from "@/lib/metrics-service";
import { runScheduledPosts } from "@/lib/scheduler/engine";

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

export const inngestFunctions = [schedulerFunction, metricsFunction, keywordScanFunction, automationFunction];
