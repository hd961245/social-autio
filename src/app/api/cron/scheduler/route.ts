import { NextResponse } from "next/server";
import { runAutoPromoteDirectDrafts } from "@/lib/automation/flywheel";
import { logAutomationRuntime } from "@/lib/automation/run-monitor";
import { authorizeCronRequest } from "@/lib/cron-auth";
import { runScheduledPosts } from "@/lib/scheduler/engine";

async function handle(request: Request) {
  const auth = await authorizeCronRequest(request);

  if (!auth.ok) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }

  try {
    const promoted = await runAutoPromoteDirectDrafts();
    const scheduler = await runScheduledPosts();
    await logAutomationRuntime({
      actionType: "ops_scheduler",
      status: "executed",
      detail:
        `scheduler ok | promoted ${promoted.promoted}/${promoted.checked}` +
        ` | published ${scheduler.published}/${scheduler.processed}` +
        ` | failed ${scheduler.failed}`
    });
    return NextResponse.json({
      ok: true,
      result: {
        promoted,
        scheduler
      }
    });
  } catch (error) {
    await logAutomationRuntime({
      actionType: "ops_scheduler",
      status: "failed",
      detail: error instanceof Error ? error.message : "Scheduler heartbeat failed"
    });
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Scheduler heartbeat failed" },
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
