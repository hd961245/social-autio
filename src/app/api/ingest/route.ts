import { NextResponse } from "next/server";
import { z } from "zod";
import { ingestAndGenerateDrafts } from "@/lib/ai/content-engine";

const ingestSchema = z.object({
  sourceType: z.enum(["url", "text", "image"]),
  sourceUrl: z.string().url().optional(),
  title: z.string().trim().max(200).optional(),
  rawText: z.string().trim().max(30000).optional(),
  imageUrls: z.array(z.string().url()).optional()
});

export async function POST(request: Request) {
  try {
    const payload = ingestSchema.parse(await request.json());
    const result = await ingestAndGenerateDrafts(payload);

    return NextResponse.json({
      ok: true,
      message: "已完成第一版內容拆解，草稿已建立。",
      ...result
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Ingestion failed"
      },
      { status: 400 }
    );
  }
}
