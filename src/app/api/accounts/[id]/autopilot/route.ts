import { NextResponse } from "next/server";
import { runDailyPersonaForAccount } from "@/lib/automation/daily-persona";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await runDailyPersonaForAccount(id);

    return NextResponse.json({
      ok: true,
      result
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "AI autopilot run failed"
      },
      { status: 400 }
    );
  }
}
