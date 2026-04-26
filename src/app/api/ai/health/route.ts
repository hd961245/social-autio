import { NextResponse } from "next/server";
import { env } from "@/lib/env";

async function runGeminiHealthCheck() {
  const apiKey = env.geminiApiKey();
  const model = env.geminiModel();

  if (!apiKey) {
    return {
      ok: false,
      provider: "gemini",
      message: "missing api key"
    };
  }

  const startedAt = Date.now();

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: "Reply with OK only." }]
            }
          ]
        }),
        signal: AbortSignal.timeout(8000)
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      return {
        ok: false,
        provider: "gemini",
        model,
        latencyMs: Date.now() - startedAt,
        message: `Gemini API error (${response.status}): ${detail.slice(0, 240)}`
      };
    }

    return {
      ok: true,
      provider: "gemini",
      model,
      latencyMs: Date.now() - startedAt,
      message: "Gemini health check passed"
    };
  } catch (error) {
    return {
      ok: false,
      provider: "gemini",
      model,
      latencyMs: Date.now() - startedAt,
      message: error instanceof Error ? error.message : "Gemini health check failed"
    };
  }
}

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
