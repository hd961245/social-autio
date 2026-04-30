import { NextResponse } from "next/server";
import { z } from "zod";
import { discoverSourceMode } from "@/lib/content/source-watch";

const discoverSchema = z.object({
  sourceUrl: z.string().url()
});

export async function POST(request: Request) {
  try {
    const payload = discoverSchema.parse(await request.json());
    const result = await discoverSourceMode(payload.sourceUrl);

    return NextResponse.json({
      ok: true,
      result
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Discover source failed"
      },
      { status: 400 }
    );
  }
}
