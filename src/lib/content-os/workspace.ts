// Stubs — these will be implemented when content-os is built out.
// Inngest jobs reference these so they need to export valid no-op functions.

export async function runVoiceIngestion() {
  return { status: "not_implemented" as const };
}

export async function runTopicScoring() {
  return { status: "not_implemented" as const };
}

export async function runAntiAiPass() {
  return { status: "not_implemented" as const };
}

export async function runLearningSynthesis() {
  return { status: "not_implemented" as const };
}

export async function getContentOsOverview() {
  return {
    summaryCards: [] as { label: string; value: string; detail: string }[],
    pipeline: [] as { id: string; label: string; status: "ready" | "watch" | "drafting"; detail: string }[],
    knowledgeLanes: [] as { id: string; label: string; count: number; description: string; highlights: string[] }[],
    topicQueue: [] as {
      id: string;
      lane: string;
      goal: string;
      targetPlatform: string;
      needsResearch: boolean;
      status: string;
      angle: string;
      score: number;
    }[],
    antiAiBoard: [] as { draftId: string; hits: { match: string; severity: "high" | "medium" | "low"; label: string }[] }[],
    imagePresets: [] as { id: string; name: string; aspectRatio: string; description: string; defaultForLanes: string[] }[],
    adapters: {
      inputs: [] as { label: string; normalizeHint: string }[],
      distribution: [] as { label: string; draftShape: string; publishMode: string }[],
      analytics: [] as { label: string; metrics: string[] }[],
      draftProviders: [] as { label: string; specialty: string }[],
      imageProviders: [] as { label: string; strengths: string[] }[]
    },
    learningRules: [] as { id: string; scope: string; signalType: string; weight: number; ruleText: string }[]
  };
}
