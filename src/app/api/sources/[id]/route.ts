import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  lastHandledStatus: z.enum(["new", "imported", "skipped"]).optional(),
  autoImportEnabled: z.boolean().optional(),
  preferredOutcome: z.enum(["threads", "wordpress"]).optional()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const payload = updateSchema.parse(await request.json());

    const item = await prisma.sourceWatch.update({
      where: { id },
      data: {
        lastHandledStatus: payload.lastHandledStatus,
        autoImportEnabled: payload.autoImportEnabled,
        preferredOutcome: payload.preferredOutcome,
        lastHandledAt: payload.lastHandledStatus ? (payload.lastHandledStatus === "new" ? null : new Date()) : undefined,
        skipCount:
          payload.lastHandledStatus === "skipped"
            ? {
                increment: 1
              }
            : undefined
      }
    });

    return NextResponse.json({ ok: true, item });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Update source failed" },
      { status: 400 }
    );
  }
}
