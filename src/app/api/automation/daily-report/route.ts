import { NextResponse } from "next/server";
import { runDailyOpsDigest } from "@/lib/automation/daily-report";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "1";

  const result = await runDailyOpsDigest(new Date(), force ? "force" : "scheduled");
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
