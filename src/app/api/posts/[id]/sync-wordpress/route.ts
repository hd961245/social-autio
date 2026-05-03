import { NextResponse } from "next/server";
import { syncPostToWordPress } from "@/lib/workflows/sync-to-wordpress";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const payload = await request.json().catch(() => ({}));
    const result = await syncPostToWordPress(id, {
      titleOverride: typeof payload?.titleOverride === "string" ? payload.titleOverride : undefined
    });

    return NextResponse.json({
      ok: true,
      message: result.duplicated
        ? "這篇貼文已經有 WordPress 草稿。"
        : result.published
          ? "已建立並自動發布到 WordPress。"
          : "已建立 WordPress 可編輯草稿。",
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
