import { NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/auth";
import { runScheduledPosts } from "@/lib/scheduler/engine";

export async function POST() {
  const authorized = await hasAdminSession();

  if (!authorized) {
    return NextResponse.json(
      {
        ok: false,
        message: "需要先登入後台，才能手動執行排程。"
      },
      { status: 401 }
    );
  }

  const result = await runScheduledPosts();
  return NextResponse.json({
    ok: true,
    result,
    message:
      result.processed > 0
        ? `已檢查 ${result.processed} 筆排程，成功 ${result.published} 筆，失敗 ${result.failed} 筆。`
        : "目前沒有到期的 Threads 排程。"
  });
}
