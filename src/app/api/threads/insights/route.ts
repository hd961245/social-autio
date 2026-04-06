import { NextResponse } from "next/server";
import { getPlatformAdapter } from "@/lib/platforms";

export async function GET() {
  const adapter = getPlatformAdapter("threads");
  const now = new Date();
  const metrics = await adapter.getUserMetrics("demo-account", new Date(now.getTime() - 7 * 86400000), now);

  return NextResponse.json({
    ok: true,
    metrics
  });
}

