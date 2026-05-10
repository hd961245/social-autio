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
