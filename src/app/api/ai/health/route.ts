import { NextResponse } from "next/server";
import { runGeminiHealthCheck } from "@/lib/ai/health";
import { env } from "@/lib/env";

export async function GET() {
  const gemini = await runGeminiHealthCheck();

  return NextResponse.json({
    ok: gemini.ok,
    gemini,
    configured: {
      openai: Boolean(env.openaiApiKey()),
      gemini: Boolean(env.geminiApiKey()),
      claude: Boolean(env.anthropicApiKey())
    }
  });
}
