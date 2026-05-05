import { NextResponse } from "next/server";
import { runOperatingHeartbeat } from "@/lib/automation/operating-heartbeat";

export async function POST() {
  try {
    const result = await runOperatingHeartbeat();
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
