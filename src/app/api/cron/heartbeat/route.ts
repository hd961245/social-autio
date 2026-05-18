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
    const persona = result.persona.ok ? result.persona.value : null;
    const promoted = result.promoted.ok ? result.promoted.value : null;
    const scheduler = result.scheduler.ok ? result.scheduler.value : null;
    const seo = result.seo.ok ? result.seo.value : null;
    const errors = Object.entries(result)
      .filter(([, v]) => !v.ok)
      .map(([k, v]) => `${k}:${(v as { error: string }).error}`)
      .join(" | ");

    await logAutomationRuntime({
      actionType: "ops_heartbeat",
      status: "executed",
      detail: [
        `heartbeat ok`,
        persona ? `persona ${persona.created}/${persona.checked}` : `persona err`,
        promoted ? `promoted ${promoted.promoted}/${promoted.checked}` : `promoted err`,
        scheduler ? `published ${scheduler.published}/${scheduler.processed}` : `scheduler err`,
        seo ? `seo ${seo.handled + seo.observed}/${seo.checked}` : `seo err`,
        errors ? `| errors: ${errors}` : ""
      ].filter(Boolean).join(" | ")
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
