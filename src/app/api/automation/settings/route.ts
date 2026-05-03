import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const settingsSchema = z.object({
  automationPaused: z.boolean().optional(),
  keywordScanPaused: z.boolean().optional(),
  missionTitle: z.string().trim().max(200).optional(),
  missionCurrentValue: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
  missionTargetValue: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
  missionUnit: z.string().trim().max(40).optional(),
  missionDeadline: z
    .string()
    .datetime({ offset: true })
    .or(z.string().datetime())
    .nullable()
    .optional(),
  autopilotMode: z.enum(["review_only", "auto_schedule", "near_full_auto"]).optional(),
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
        missionTitle: "用 AI 維持內容輸出與成長節奏",
        missionCurrentValue: 0,
        missionTargetValue: 30000,
        missionUnit: "月點擊",
        missionDeadline: null,
        autopilotMode: "near_full_auto",
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
    const normalizedPayload = {
      ...payload,
      missionDeadline: payload.missionDeadline ? new Date(payload.missionDeadline) : payload.missionDeadline
    };
    const existing = await prisma.appSettings.findFirst();

    const settings = existing
      ? await prisma.appSettings.update({
          where: { id: existing.id },
          data: normalizedPayload
        })
      : await prisma.appSettings.create({
          data: {
            automationPaused: normalizedPayload.automationPaused ?? false,
            keywordScanPaused: normalizedPayload.keywordScanPaused ?? false,
            missionTitle: normalizedPayload.missionTitle,
            missionCurrentValue: normalizedPayload.missionCurrentValue ?? 0,
            missionTargetValue: normalizedPayload.missionTargetValue ?? 30000,
            missionUnit: normalizedPayload.missionUnit ?? "月點擊",
            missionDeadline: normalizedPayload.missionDeadline ?? null,
            autopilotMode: normalizedPayload.autopilotMode ?? "near_full_auto",
            globalPersonaPrompt: normalizedPayload.globalPersonaPrompt,
            editorialDirection: normalizedPayload.editorialDirection,
            editorialGoal: normalizedPayload.editorialGoal,
            defaultTone: normalizedPayload.defaultTone ?? "sharp-observer",
            aiProvider: normalizedPayload.aiProvider ?? "auto",
            affiliateBlockPrimary: normalizedPayload.affiliateBlockPrimary,
            affiliateBlockSecondary: normalizedPayload.affiliateBlockSecondary,
            affiliateDisclosure: normalizedPayload.affiliateDisclosure,
            affiliateCta: normalizedPayload.affiliateCta
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
