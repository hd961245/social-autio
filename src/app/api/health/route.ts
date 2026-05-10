import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  let dbStatus = "unknown";
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "connected";
  } catch {
    dbStatus = "error";
  }
  // Always return 200 so Zeabur routes traffic even if DB is misconfigured.
  // DB error is surfaced in the response body for diagnostics.
  return NextResponse.json({ ok: true, db: dbStatus }, { status: 200 });
}
