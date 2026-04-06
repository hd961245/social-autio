import { NextResponse } from "next/server";
import { syncPostToWordPress } from "@/lib/workflows/sync-to-wordpress";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await syncPostToWordPress(id);

    return NextResponse.json({
      ok: true,
      message: result.duplicated ? "這篇貼文已經有 WordPress 草稿。" : "已建立 WordPress 草稿佇列。",
      ...result
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "WordPress sync failed"
      },
      { status: 400 }
    );
  }
}
