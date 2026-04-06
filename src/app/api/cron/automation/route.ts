import { NextResponse } from "next/server";
import { evaluateAutomationRules } from "@/lib/automation/rules-engine";

export async function POST() {
  try {
    const result = await evaluateAutomationRules();
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Automation evaluation failed" },
      { status: 500 }
    );
  }
}

