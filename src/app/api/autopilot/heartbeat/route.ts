import { NextResponse } from "next/server";
import { runDailyPersonaAutopilot } from "@/lib/automation/daily-persona";
import { runSeoOpportunityAutopilot } from "@/lib/automation/seo-opportunity";

export async function POST() {
  try {
    const [personaResult, seoResult] = await Promise.all([runDailyPersonaAutopilot(), runSeoOpportunityAutopilot()]);
    return NextResponse.json({
      ok: true,
      result: {
        persona: personaResult,
        seo: seoResult
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Autopilot heartbeat failed"
      },
      { status: 500 }
    );
  }
}
