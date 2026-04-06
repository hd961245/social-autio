import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const ruleSchema = z.object({
  name: z.string().trim().min(1),
  triggerKeyword: z.string().trim().min(1),
  replyTemplate: z.string().trim().min(1),
  accountId: z.string().min(1),
  dailyLimit: z.number().int().min(1).max(500).default(50)
});

export async function GET() {
  const rules = await prisma.autoRule.findMany({
    orderBy: {
      createdAt: "desc"
    }
  });

  return NextResponse.json({ ok: true, rules });
}

export async function POST(request: Request) {
  try {
    const payload = ruleSchema.parse(await request.json());

    const rule = await prisma.autoRule.create({
      data: {
        userId: "seed-admin",
        name: payload.name,
        triggerType: "keyword_match",
        triggerConfig: JSON.stringify({ keyword: payload.triggerKeyword }),
        actionType: "reply",
        actionConfig: JSON.stringify({
          mode: "template",
          accountId: payload.accountId,
          template: payload.replyTemplate
        }),
        dailyLimit: payload.dailyLimit
      }
    });

    return NextResponse.json({ ok: true, rule });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Rule creation failed" },
      { status: 400 }
    );
  }
}

