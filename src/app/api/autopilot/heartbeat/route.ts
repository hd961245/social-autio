import { NextResponse } from "next/server";
import { runOperatingHeartbeat } from "@/lib/automation/operating-heartbeat";
import { authorizeCronRequest } from "@/lib/cron-auth";

async function handle(request: Request) {
  try {
    const auth = await authorizeCronRequest(request);

    if (!auth.ok) {
      return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
    }

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

export async function POST(request: Request) {
  return handle(request);
}

export async function GET(request: Request) {
  return handle(request);
}
