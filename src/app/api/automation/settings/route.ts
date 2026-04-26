import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const settingsSchema = z.object({
  automationPaused: z.boolean().optional(),
  keywordScanPaused: z.boolean().optional(),
  globalPersonaPrompt: z.string().trim().max(5000).optional(),
  editorialDirection: z.string().trim().max(3000).optional(),
  editorialGoal: z.string().trim().max(1000).optional(),
  defaultTone: z.string().trim().max(100).optional(),
  aiProvider: z.enum(["auto", "gemini", "claude", "openai"]).optional(),
  affiliateBlockPrimary: z.string().trim().max(1000).optional(),
  affiliateBlockSecondary: z.string().trim().max(1000).optional(),
  affiliateDisclosure: z.string().trim().max(1000).optional(),
  affiliateCta: z.string().trim().max(1000).optional()
});

export async function GET() {
  const settings = await prisma.appSettings.findFirst();
  return NextResponse.json({
    ok: true,
    settings: settings ?? {
        automationPaused: false,
        keywordScanPaused: false,
        globalPersonaPrompt: "",
        editorialDirection: "",
        editorialGoal: "",
        defaultTone: "sharp-observer",
        aiProvider: "auto",
        affiliateBlockPrimary: "",
        affiliateBlockSecondary: "",
        affiliateDisclosure: "",
        affiliateCta: ""
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
            editorialDirection: payload.editorialDirection,
            editorialGoal: payload.editorialGoal,
            defaultTone: payload.defaultTone ?? "sharp-observer",
            aiProvider: payload.aiProvider ?? "auto",
            affiliateBlockPrimary: payload.affiliateBlockPrimary,
            affiliateBlockSecondary: payload.affiliateBlockSecondary,
            affiliateDisclosure: payload.affiliateDisclosure,
            affiliateCta: payload.affiliateCta
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
