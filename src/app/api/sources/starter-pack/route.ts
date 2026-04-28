import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FINANCE_STARTER_PACK } from "@/lib/content/source-starter-packs";

export async function POST() {
  try {
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
          in: FINANCE_STARTER_PACK.map((item) => item.sourceUrl)
        }
      }
    });

    const existingUrls = new Set(existing.map((item) => item.sourceUrl));
    const created = [];

    for (const preset of FINANCE_STARTER_PACK) {
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
      createdCount: created.length,
      skippedCount: FINANCE_STARTER_PACK.length - created.length,
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
