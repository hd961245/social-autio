import { NextResponse } from "next/server";
import { runDailyPersonaForAccount } from "@/lib/automation/daily-persona";
import { prisma } from "@/lib/prisma";
import { toDisplayErrorMessage } from "@/lib/error-display";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const result = await runDailyPersonaForAccount(id);

    return NextResponse.json({
      ok: true,
      result
    });
  } catch (error) {
    const display = toDisplayErrorMessage(error);

    try {
      await prisma.automationLog.create({
        data: {
          accountId: id,
          actionType: "daily_persona_generation",
          status: "failed",
          detail: display.message
        }
      });
    } catch {}

    return NextResponse.json(
      {
        ok: false,
        message: display.message,
        rawMessage: display.rawMessage
      },
      { status: 400 }
    );
  }
}
