import { NextResponse } from "next/server";
import { z } from "zod";

import { processSeoOpportunity } from "@/lib/automation/seo-opportunity";

const schema = z.object({
  page: z.string().min(1),
  query: z.string().optional(),
  lane: z.enum(["refresh", "expand", "capture"]),
  confidence: z.enum(["high", "medium", "low"]),
  reason: z.string().min(1),
  action: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const payload = schema.parse(await request.json());
    const result = await processSeoOpportunity(payload, "manual");

    return NextResponse.json({
      ...result
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "建立 SEO 優化稿失敗"
      },
      { status: 400 }
    );
  }
}
