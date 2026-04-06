import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const keywordSchema = z.object({
  keyword: z.string().trim().min(1),
  matchMode: z.enum(["contains", "exact", "regex"]).default("contains")
});

export async function GET() {
  const keywords = await prisma.keyword.findMany({
    orderBy: {
      createdAt: "desc"
    }
  });

  return NextResponse.json({ ok: true, keywords });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = keywordSchema.parse(body);

    const keyword = await prisma.keyword.create({
      data: {
        userId: "seed-admin",
        keyword: payload.keyword,
        matchMode: payload.matchMode
      }
    });

    return NextResponse.json({ ok: true, keyword });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Keyword creation failed" },
      { status: 400 }
    );
  }
}

