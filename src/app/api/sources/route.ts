import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const sourceSchema = z.object({
  label: z.string().trim().min(1).max(120),
  sourceType: z.enum(["rss", "url"]),
  sourceUrl: z.string().url(),
  autoImportEnabled: z.boolean().optional().default(false),
  preferredOutcome: z.enum(["threads", "wordpress"]).optional().default("threads")
});

export async function POST(request: Request) {
  try {
    const payload = sourceSchema.parse(await request.json());
    const user = await prisma.user.upsert({
      where: { id: "seed-admin" },
      update: {},
      create: {
        id: "seed-admin",
        name: "Admin"
      }
    });

    const item = await prisma.sourceWatch.create({
      data: {
        userId: user.id,
        label: payload.label,
        sourceType: payload.sourceType,
        sourceUrl: payload.sourceUrl,
        isActive: true,
        autoImportEnabled: payload.autoImportEnabled,
        preferredOutcome: payload.preferredOutcome
      }
    });

    return NextResponse.json({ ok: true, item });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Create source failed" },
      { status: 400 }
    );
  }
}
