import { NextResponse } from "next/server";
import { z } from "zod";
import { findEditorialPresetBySiteUrl } from "@/lib/content/editorial-presets";
import { prisma } from "@/lib/prisma";

const presetSchema = z.object({
  accountId: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const payload = presetSchema.parse(await request.json());
    const account = await prisma.platformAccount.findUnique({
      where: { id: payload.accountId }
    });

    if (!account || account.platform !== "wordpress") {
      return NextResponse.json({ ok: false, message: "找不到指定的 WordPress 站台。" }, { status: 404 });
    }

    const preset = findEditorialPresetBySiteUrl(account.platformUserId);

    if (!preset) {
      return NextResponse.json({ ok: false, message: "這個站台目前沒有可直接套用的內容記憶 preset。" }, { status: 404 });
    }

    const existing = await prisma.appSettings.findFirst();
    const settings = existing
      ? await prisma.appSettings.update({
          where: { id: existing.id },
          data: {
            globalPersonaPrompt: preset.globalPersonaPrompt,
            defaultTone: preset.defaultTone,
            writingStyleProfile: preset.writingStyleProfile,
            affiliateLinkPolicy: preset.affiliateLinkPolicy,
            affiliateBlockPrimary: preset.affiliateLibrary.primary,
            affiliateBlockSecondary: preset.affiliateLibrary.secondary,
            affiliateDisclosure: preset.affiliateLibrary.disclosure,
            affiliateCta: preset.affiliateLibrary.cta
          }
        })
      : await prisma.appSettings.create({
          data: {
            globalPersonaPrompt: preset.globalPersonaPrompt,
            defaultTone: preset.defaultTone,
            aiProvider: "auto",
            writingStyleProfile: preset.writingStyleProfile,
            affiliateLinkPolicy: preset.affiliateLinkPolicy,
            affiliateBlockPrimary: preset.affiliateLibrary.primary,
            affiliateBlockSecondary: preset.affiliateLibrary.secondary,
            affiliateDisclosure: preset.affiliateLibrary.disclosure,
            affiliateCta: preset.affiliateLibrary.cta
          }
        });

    return NextResponse.json({
      ok: true,
      preset: {
        id: preset.id,
        label: preset.label,
        summary: preset.summary
      },
      writingStyleProfile: settings.writingStyleProfile,
      affiliateLinkPolicy: settings.affiliateLinkPolicy,
      message: `已套用 ${preset.label} 的站台記憶，之後生成 WordPress 草稿會更貼近這個站的邏輯。`
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Preset memory apply failed"
      },
      { status: 400 }
    );
  }
}
