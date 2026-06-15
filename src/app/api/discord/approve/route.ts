import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeCronRequest } from "@/lib/cron-auth";
import { prisma } from "@/lib/prisma";

const approveSchema = z.object({
  postId: z.string().min(1)
});

export async function POST(request: Request) {
  const auth = await authorizeCronRequest(request);
  if (!auth.ok) return NextResponse.json({ ok: false }, { status: 401 });

  try {
    const { postId } = approveSchema.parse(await request.json());

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, title: true, textContent: true, status: true, contentType: true }
    });

    if (!post) {
      return NextResponse.json({ ok: false, message: "找不到這個草稿" }, { status: 404 });
    }

    if (post.status !== "draft") {
      return NextResponse.json({ ok: false, message: `草稿狀態為 ${post.status}，無法批准` }, { status: 400 });
    }

    await prisma.post.update({
      where: { id: postId },
      data: {
        approvalState: "approved",
        approvalDecisionAt: new Date(),
        approvalToken: null,
        status: "scheduled",
        scheduledAt: new Date(Date.now() + 5 * 60 * 1000) // 5 分鐘後發
      }
    });

    return NextResponse.json({
      ok: true,
      postId,
      title: post.title ?? post.textContent?.slice(0, 60) ?? "（無標題）",
      scheduledIn: "5 分鐘"
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      message: error instanceof Error ? error.message : "approve failed"
    }, { status: 400 });
  }
}
