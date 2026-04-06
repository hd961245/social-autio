import { NextResponse } from "next/server";
import { scanKeywordMatches } from "@/lib/keywords/monitor";

export async function POST() {
  const result = await scanKeywordMatches();
  return NextResponse.json({ ok: true, result });
}

