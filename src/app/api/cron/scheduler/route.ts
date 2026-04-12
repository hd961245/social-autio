import { NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/cron-auth";
import { runScheduledPosts } from "@/lib/scheduler/engine";

async function handle(request: Request) {
  const auth = await authorizeCronRequest(request);

  if (!auth.ok) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }

  const result = await runScheduledPosts();
  return NextResponse.json({ ok: true, result });
}

export async function POST(request: Request) {
  return handle(request);
}

export async function GET(request: Request) {
  return handle(request);
}
