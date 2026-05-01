import { NextResponse } from "next/server";
import { runDailyPersonaAutopilot } from "@/lib/automation/daily-persona";

export async function POST() {
  try {
    const result = await runDailyPersonaAutopilot();
    return NextResponse.json({
      ok: true,
      result
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
