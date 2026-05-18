import { cron } from "inngest";
import { inngest } from "@/inngest/client";
import { evaluateAutomationRules } from "@/lib/automation/rules-engine";
import { runDailyPersonaAutopilot } from "@/lib/automation/daily-persona";
import { scanKeywordMatches } from "@/lib/keywords/monitor";
import { collectMetricsSnapshots, refreshExpiringTokens } from "@/lib/metrics-service";
import { runScheduledPosts } from "@/lib/scheduler/engine";
import { refreshAllSourceWatches, runDailySourceImports } from "@/lib/sources-service";
import { runAutoPromoteDirectDrafts, runAutoWordPressExpansion, runOptimizationFlywheel } from "@/lib/automation/flywheel";
import { runDailyOpsDigest } from "@/lib/automation/daily-report";
import {
  runAntiAiPass,
  runLearningSynthesis,
  runTopicScoring,
  runVoiceIngestion
} from "@/lib/content-os/workspace";
import { rewriteContentWithAi } from "@/lib/ai/gateway";
import { prisma } from "@/lib/prisma";

export const schedulerFunction = inngest.createFunction(
  { id: "publish-scheduled-posts", retries: 1, concurrency: 1, triggers: [cron("* * * * *")] },
  async ({ step }) => {
    return step.run("publish-due-posts", async () => runScheduledPosts());
  }
);

export const metricsFunction = inngest.createFunction(
  { id: "collect-metrics-and-refresh-tokens", retries: 1, concurrency: 1, triggers: [cron("0 */6 * * *")] },
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
  { id: "scan-keyword-matches", retries: 1, concurrency: 1, triggers: [cron("*/30 * * * *")] },
  async ({ step }) => {
    return step.run("scan-keywords", async () => scanKeywordMatches());
  }
);

export const automationFunction = inngest.createFunction(
  { id: "evaluate-automation-rules", retries: 1, concurrency: 1, triggers: [cron("*/30 * * * *")] },
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
  { id: "daily-persona-autopilot", retries: 1, concurrency: 1, triggers: [cron("*/15 * * * *")] },
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
  { id: "auto-promote-direct-drafts", retries: 1, concurrency: 1, triggers: [cron("*/20 * * * *")] },
  async ({ step }) => {
    const result = await step.run("promote-high-confidence-drafts", async () => runAutoPromoteDirectDrafts());

    return result;
  }
);

export const dailyOpsDigestFunction = inngest.createFunction(
  { id: "daily-ops-digest", retries: 1, triggers: [cron("0 * * * *")] },
  async ({ step }) => {
    return step.run("send-daily-ops-digest", async () => runDailyOpsDigest());
  }
);

export const contentVoiceIngestionFunction = inngest.createFunction(
  { id: "content-os-voice-ingestion", retries: 1, triggers: [cron("30 2,14 * * *")] },
  async ({ step }) => {
    return step.run("content-os-ingest-voice", async () => runVoiceIngestion());
  }
);

export const contentTopicScoringFunction = inngest.createFunction(
  { id: "content-os-topic-scoring", retries: 1, triggers: [cron("45 3,15 * * *")] },
  async ({ step }) => {
    return step.run("content-os-score-topics", async () => runTopicScoring());
  }
);

export const contentAntiAiFunction = inngest.createFunction(
  { id: "content-os-anti-ai", retries: 1, triggers: [cron("15 4 * * *")] },
  async ({ step }) => {
    return step.run("content-os-anti-ai-pass", async () => runAntiAiPass());
  }
);

export const contentLearningFunction = inngest.createFunction(
  { id: "content-os-learning", retries: 1, triggers: [cron("20 5 * * *")] },
  async ({ step }) => {
    return step.run("content-os-learning-synthesis", async () => runLearningSynthesis());
  }
);

export type AiDraftEvent = {
  data: {
    postId: string;
    title: string;
    rawText: string;
    personaPrompt: string;
    tone: string;
    siteUrl: string | undefined;
    wordpressTemplate: "opinion" | "case-study" | "tool-review" | "weekly-recap";
    preferredProvider: "auto" | "gemini" | "claude" | "openai";
    brief: string;
  };
};

export const aiDraftFunction = inngest.createFunction(
  { id: "ai-draft-background", retries: 1 },
  { event: "social-audio/ai.draft.requested" },
  async ({ event, step }) => {
    const { postId, title, rawText, personaPrompt, tone, siteUrl, wordpressTemplate, preferredProvider, brief } =
      event.data as AiDraftEvent["data"];

    const result = await step.run("generate-wordpress-draft", async () =>
      rewriteContentWithAi({
        title,
        rawText,
        personaPrompt,
        tone,
        siteUrl,
        wordpressTemplate,
        preferredProvider,
        threadsOnly: false
      })
    );

    await step.run("save-draft-to-db", async () => {
      await prisma.post.update({
        where: { id: postId },
        data: {
          title: result.wordpressTitle || result.summary.slice(0, 120),
          textContent: result.threadsDraft,
          htmlContent: result.wordpressHtml,
          excerpt: result.wordpressExcerpt || brief || result.summary,
          status: "draft"
        }
      });
    });

    return { postId, provider: result.provider };
  }
);

export const inngestFunctions = [
  schedulerFunction,
  metricsFunction,
  keywordScanFunction,
  automationFunction,
  autoPromoteDraftsFunction,
  dailyOpsDigestFunction,
  sourceWatchRefreshFunction,
  dailySourceImportFunction,
  dailyPersonaAutopilotFunction,
  optimizationFlywheelFunction,
  contentVoiceIngestionFunction,
  contentTopicScoringFunction,
  contentAntiAiFunction,
  contentLearningFunction,
  aiDraftFunction
];
