import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  isActive: z.boolean().optional(),
  name: z.string().trim().min(1).optional(),
  dailyLimit: z.number().int().min(1).max(500).optional()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const payload = updateSchema.parse(await request.json());

    const rule = await prisma.autoRule.update({
      where: { id },
      data: payload
    });

    return NextResponse.json({ ok: true, rule });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Rule update failed" },
      { status: 400 }
    );
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.autoRule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

