import { NextResponse } from "next/server";
import { z } from "zod";
import { publishExistingThreadsPost } from "@/lib/posts/publish-existing";

const bulkPublishSchema = z.object({
  postIds: z.array(z.string().min(1)).min(1).max(20)
});

export async function POST(request: Request) {
  try {
    const payload = bulkPublishSchema.parse(await request.json());
    const uniqueIds = Array.from(new Set(payload.postIds));

    const results = await Promise.allSettled(uniqueIds.map((postId) => publishExistingThreadsPost(postId)));
    const publishedIds: string[] = [];
    const failed: Array<{ postId: string; message: string }> = [];

    results.forEach((result, index) => {
      const postId = uniqueIds[index];

      if (result.status === "fulfilled") {
        publishedIds.push(postId);
        return;
      }

      failed.push({
        postId,
        message: result.reason instanceof Error ? result.reason.message : "Unknown publish error"
      });
    });

    return NextResponse.json({
      ok: failed.length === 0,
      publishedIds,
      failed,
      message:
        failed.length === 0
          ? `已直接發布 ${publishedIds.length} 篇 Threads 草稿。`
          : `成功發布 ${publishedIds.length} 篇，另有 ${failed.length} 篇失敗。`
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Bulk publish failed"
      },
      { status: 400 }
    );
  }
}
