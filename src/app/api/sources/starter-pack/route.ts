import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { FINANCE_STARTER_PACKS, getFinanceStarterPack } from "@/lib/content/source-starter-packs";

const starterPackSchema = z
  .object({
    packId: z.string().optional().default("all")
  })
  .optional();

export async function POST(request: Request) {
  try {
    const payload = starterPackSchema.parse(await request.json().catch(() => ({})));
    const selectedPack = getFinanceStarterPack(payload?.packId);

    if (!selectedPack.length) {
      return NextResponse.json(
        {
          ok: false,
          message: "找不到這組 starter pack。"
        },
        { status: 404 }
      );
    }

    const user = await prisma.user.upsert({
      where: { id: "seed-admin" },
      update: {},
      create: {
        id: "seed-admin",
        name: "Admin"
      }
    });

    const existing = await prisma.sourceWatch.findMany({
      where: {
        userId: user.id,
        sourceUrl: {
          in: selectedPack.map((item) => item.sourceUrl)
        }
      }
    });

    const existingUrls = new Set(existing.map((item) => item.sourceUrl));
    const created = [];

    for (const preset of selectedPack) {
      if (existingUrls.has(preset.sourceUrl)) {
        continue;
      }

      const item = await prisma.sourceWatch.create({
        data: {
          userId: user.id,
          label: preset.label,
          sourceType: preset.sourceType,
          sourceUrl: preset.sourceUrl,
          isActive: true,
          autoImportEnabled: preset.autoImportEnabled,
          preferredOutcome: preset.preferredOutcome
        }
      });

      created.push(item);
    }

    return NextResponse.json({
      ok: true,
      packId: payload?.packId ?? "all",
      availablePacks: FINANCE_STARTER_PACKS.map((pack) => ({ id: pack.id, title: pack.title })),
      createdCount: created.length,
      skippedCount: selectedPack.length - created.length,
      items: created
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Create starter pack failed"
      },
      { status: 400 }
    );
  }
}
