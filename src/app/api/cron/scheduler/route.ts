import { NextResponse } from "next/server";
import { runScheduledPosts } from "@/lib/scheduler/engine";

export async function POST() {
  const result = await runScheduledPosts();
  return NextResponse.json({ ok: true, result });
}

