import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  keyword: z.string().trim().min(1).optional(),
  matchMode: z.enum(["contains", "exact", "regex"]).optional(),
  isActive: z.boolean().optional()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const payload = updateSchema.parse(await request.json());

    const keyword = await prisma.keyword.update({
      where: { id },
      data: payload
    });

    return NextResponse.json({ ok: true, keyword });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Keyword update failed" },
      { status: 400 }
    );
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.keyword.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

