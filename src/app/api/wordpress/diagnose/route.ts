import { NextResponse } from "next/server";
import { z } from "zod";
import { diagnoseWordPressConnection } from "@/lib/platforms/wordpress/client";

const diagnoseSchema = z.object({
  siteUrl: z.string().url(),
  username: z.string().min(1),
  appPassword: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const payload = diagnoseSchema.parse(await request.json());
    const result = await diagnoseWordPressConnection(payload.siteUrl, payload.username, payload.appPassword);

    return NextResponse.json({
      ok: result.ok,
      stage: result.stage,
      message: result.message,
      hints: result.hints
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "WordPress diagnose failed"
      },
      { status: 400 }
    );
  }
}
