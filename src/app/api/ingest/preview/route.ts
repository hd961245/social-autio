import { NextResponse } from "next/server";
import { z } from "zod";
import { extractContentFromUrl } from "@/lib/content/url-ingest";

const previewSchema = z.object({
  sourceUrl: z.string().url()
});

export async function POST(request: Request) {
  try {
    const payload = previewSchema.parse(await request.json());
    const preview = await extractContentFromUrl(payload.sourceUrl);

    return NextResponse.json({
      ok: true,
      preview: {
        title: preview.title,
        excerpt: preview.excerpt,
        text: preview.text.slice(0, 2400),
        sourceLabel: preview.sourceLabel,
        resolvedUrl: preview.resolvedUrl
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Preview failed"
      },
      { status: 400 }
    );
  }
}
