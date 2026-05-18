import { NextResponse } from "next/server";
import { runOperatingHeartbeat } from "@/lib/automation/operating-heartbeat";
import { getLatestAutomationRuntimeStatus, logAutomationRuntime } from "@/lib/automation/run-monitor";
import { authorizeCronRequest } from "@/lib/cron-auth";

export async function POST(request: Request) {
  try {
    const auth = await authorizeCronRequest(request);

    if (!auth.ok) {
      return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
    }

    const result = await runOperatingHeartbeat();
    const persona = result.persona.ok ? result.persona.value : null;
    const promoted = result.promoted.ok ? result.promoted.value : null;
    const scheduler = result.scheduler.ok ? result.scheduler.value : null;
    await logAutomationRuntime({
      actionType: "ops_heartbeat",
      status: "executed",
      detail: [
        "legacy heartbeat ok",
        persona ? `persona ${persona.created}/${persona.checked}` : `persona err`,
        promoted ? `promoted ${promoted.promoted}/${promoted.checked}` : `promoted err`,
        scheduler ? `published ${scheduler.published}/${scheduler.processed}` : `scheduler err`
      ].join(" | ")
    });
    return NextResponse.json({
      ok: true,
      result
    });
  } catch (error) {
    await logAutomationRuntime({
      actionType: "ops_heartbeat",
      status: "failed",
      detail: error instanceof Error ? error.message : "Autopilot heartbeat failed"
    });
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Autopilot heartbeat failed"
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const status = await getLatestAutomationRuntimeStatus();
  return NextResponse.json(status);
}
