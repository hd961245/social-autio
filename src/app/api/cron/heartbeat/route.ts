import { NextResponse } from "next/server";
import { runOperatingHeartbeat } from "@/lib/automation/operating-heartbeat";
import { logAutomationRuntime } from "@/lib/automation/run-monitor";
import { authorizeCronRequest } from "@/lib/cron-auth";

async function handle(request: Request) {
  const auth = await authorizeCronRequest(request);

  if (!auth.ok) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }

  try {
    const result = await runOperatingHeartbeat();
    await logAutomationRuntime({
      actionType: "ops_heartbeat",
      status: "executed",
      detail:
        `heartbeat ok | persona ${result.persona.created}/${result.persona.checked}` +
        ` | promoted ${result.promoted.promoted}/${result.promoted.checked}` +
        ` | published ${result.scheduler.published}/${result.scheduler.processed}` +
        ` | seo ${result.seo.handled + result.seo.observed}/${result.seo.checked}`
    });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    await logAutomationRuntime({
      actionType: "ops_heartbeat",
      status: "failed",
      detail: error instanceof Error ? error.message : "Operating heartbeat failed"
    });
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Operating heartbeat failed" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return handle(request);
}

export async function GET(request: Request) {
  return handle(request);
}
