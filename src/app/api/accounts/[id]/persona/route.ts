import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const personaSchema = z.object({
  personaLabel: z.string().trim().max(80).optional().or(z.literal("")),
  personaPrompt: z.string().trim().max(3000).optional().or(z.literal("")),
  defaultTone: z.string().trim().max(80).optional().or(z.literal(""))
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const payload = personaSchema.parse(await request.json());

    const account = await prisma.platformAccount.update({
      where: { id },
      data: {
        personaLabel: payload.personaLabel || null,
        personaPrompt: payload.personaPrompt || null,
        defaultTone: payload.defaultTone || null
      }
    });

    return NextResponse.json({
      ok: true,
      account: {
        id: account.id,
        personaLabel: account.personaLabel,
        personaPrompt: account.personaPrompt,
        defaultTone: account.defaultTone
      }
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Account persona update failed" },
      { status: 400 }
    );
  }
}
