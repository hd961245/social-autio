import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    ok: true,
    message: "Metrics collection scaffold is ready for Phase 2 implementation."
  });
}

