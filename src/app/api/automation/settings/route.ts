import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const settingsSchema = z.object({
  automationPaused: z.boolean().optional(),
  keywordScanPaused: z.boolean().optional(),
  globalPersonaPrompt: z.string().trim().max(5000).optional(),
  defaultTone: z.string().trim().max(100).optional()
});

export async function GET() {
  const settings = await prisma.appSettings.findFirst();
  return NextResponse.json({
    ok: true,
    settings: settings ?? {
      automationPaused: false,
      keywordScanPaused: false,
      globalPersonaPrompt: "",
      defaultTone: "sharp-observer"
    }
  });
}

export async function PATCH(request: Request) {
  try {
    const payload = settingsSchema.parse(await request.json());
    const existing = await prisma.appSettings.findFirst();

    const settings = existing
      ? await prisma.appSettings.update({
          where: { id: existing.id },
          data: payload
        })
      : await prisma.appSettings.create({
          data: {
            automationPaused: payload.automationPaused ?? false,
            keywordScanPaused: payload.keywordScanPaused ?? false,
            globalPersonaPrompt: payload.globalPersonaPrompt,
            defaultTone: payload.defaultTone ?? "sharp-observer"
          }
        });

    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Settings update failed" },
      { status: 400 }
    );
  }
}
