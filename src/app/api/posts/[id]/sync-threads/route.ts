import { NextResponse } from "next/server";
import { syncPostToThreads } from "@/lib/workflows/sync-to-threads";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await syncPostToThreads(id);

    return NextResponse.json({
      ok: true,
      message: result.duplicated ? "這篇文章已經有 Threads 摘要佇列。" : "已建立 Threads 摘要佇列。",
      ...result
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Threads sync failed"
      },
      { status: 400 }
    );
  }
}
