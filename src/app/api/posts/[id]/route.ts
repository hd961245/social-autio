import { NextResponse } from "next/server";
import { z } from "zod";
import { logPublishEvent } from "@/lib/publish-log";
import { publishToWordPress, updateWordPressDraft } from "@/lib/platforms/wordpress/publisher";
import { prisma } from "@/lib/prisma";

const updatePostSchema = z.object({
  accountId: z.string().min(1),
  title: z.string().trim().max(200).optional(),
  text: z.string().trim().min(1).max(100000),
  html: z.string().trim().optional(),
  excerpt: z.string().trim().max(500).optional(),
  mediaUrls: z.array(z.string().url()).optional(),
  featuredImageUrl: z.string().url().optional(),
  categories: z.array(z.string().trim().min(1)).optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
  publishMode: z.enum(["immediate", "scheduled"]).default("immediate"),
  scheduledAt: z.string().datetime().optional(),
  requiresApproval: z.boolean().optional().default(false)
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const payload = updatePostSchema.parse(await request.json());

    const existingPost = await prisma.post.findUnique({
      where: { id },
      include: {
        account: true
      }
    });

    if (!existingPost) {
      return NextResponse.json({ ok: false, message: "找不到指定草稿" }, { status: 404 });
    }

    if (existingPost.status === "published" && existingPost.account.platform === "threads") {
      return NextResponse.json({ ok: false, message: "已發布的 Threads 貼文不可直接編輯" }, { status: 400 });
    }

    const settings =
      existingPost.account.platform === "wordpress"
        ? await prisma.appSettings.findFirst()
        : null;
    const wordpressRemoteStatus =
      settings?.wordpressPublishMode === "auto_publish" ? "publish" : "draft";
    const wordpressLocalStatus =
      wordpressRemoteStatus === "publish" ? "published" : "draft";

    const nextStatus =
      existingPost.account.platform === "wordpress"
        ? wordpressLocalStatus
        : payload.publishMode === "scheduled"
          ? "scheduled"
          : payload.requiresApproval
            ? "scheduled"
            : "draft";

    const updatedPost = await prisma.post.update({
      where: { id },
      data: {
        accountId: payload.accountId,
        title: payload.title ?? null,
        textContent: payload.text,
        htmlContent: payload.html ?? null,
        excerpt: payload.excerpt ?? null,
        mediaUrls: payload.mediaUrls?.length ? JSON.stringify(payload.mediaUrls) : null,
        featuredImageUrl: payload.featuredImageUrl ?? null,
        categories: payload.categories?.length ? JSON.stringify(payload.categories) : null,
        tags: payload.tags?.length ? JSON.stringify(payload.tags) : null,
        status: nextStatus,
        scheduledAt:
          nextStatus === "scheduled" && payload.scheduledAt
            ? new Date(payload.scheduledAt)
            : payload.requiresApproval
              ? new Date()
              : null,
        requiresApproval: payload.requiresApproval,
        approvalState: payload.requiresApproval ? "pending" : null,
        approvalToken: null,
        approvalRequestedAt: null,
        approvalDecisionAt: null,
        errorMessage: null
      },
      include: {
        account: true
      }
    });

    if (updatedPost.account.platform === "wordpress") {
      try {
        const result =
          updatedPost.platformPostId
            ? await updateWordPressDraft(updatedPost.accountId, updatedPost.platformPostId, {
                contentType: updatedPost.contentType as "text" | "image" | "video" | "carousel",
                title: updatedPost.title ?? undefined,
                text: updatedPost.textContent ?? undefined,
                html: updatedPost.htmlContent ?? undefined,
                excerpt: updatedPost.excerpt ?? undefined,
              mediaUrls: updatedPost.mediaUrls ? (JSON.parse(updatedPost.mediaUrls) as string[]) : undefined,
              featuredImageUrl: updatedPost.featuredImageUrl ?? undefined,
              categories: updatedPost.categories ? (JSON.parse(updatedPost.categories) as string[]) : undefined,
                tags: updatedPost.tags ? (JSON.parse(updatedPost.tags) as string[]) : undefined
              }, { status: wordpressRemoteStatus })
            : await publishToWordPress(updatedPost.accountId, {
                contentType: updatedPost.contentType as "text" | "image" | "video" | "carousel",
                title: updatedPost.title ?? undefined,
                text: updatedPost.textContent ?? undefined,
                html: updatedPost.htmlContent ?? undefined,
                excerpt: updatedPost.excerpt ?? undefined,
                mediaUrls: updatedPost.mediaUrls ? (JSON.parse(updatedPost.mediaUrls) as string[]) : undefined,
                featuredImageUrl: updatedPost.featuredImageUrl ?? undefined,
                categories: updatedPost.categories ? (JSON.parse(updatedPost.categories) as string[]) : undefined,
                tags: updatedPost.tags ? (JSON.parse(updatedPost.tags) as string[]) : undefined
              }, { status: wordpressRemoteStatus });

        await prisma.post.update({
          where: { id: updatedPost.id },
          data: {
            platformPostId: result.platformPostId,
            platformUrl: result.url ?? null,
            errorMessage: null,
            status: wordpressLocalStatus,
            publishedAt: wordpressLocalStatus === "published" ? new Date() : null
          }
        });

        await logPublishEvent({
          accountId: updatedPost.accountId,
          postId: updatedPost.id,
          actionType: "wordpress_draft_sync",
          status: "executed",
          detail:
            wordpressRemoteStatus === "publish"
              ? updatedPost.platformPostId
                ? "WordPress 已自動更新並發布"
                : "已建立並自動發布到 WordPress"
              : updatedPost.platformPostId
                ? "WordPress 後台草稿已更新"
                : "已建立 WordPress 後台草稿"
        });

        return NextResponse.json({
          ok: true,
          postId: updatedPost.id,
          message: wordpressRemoteStatus === "publish" ? "WordPress 文章已同步並發布。" : "WordPress 草稿已更新。"
        });
      } catch (error) {
        await prisma.post.update({
          where: { id: updatedPost.id },
          data: {
            errorMessage: error instanceof Error ? error.message : "WordPress draft update failed"
          }
        });

        await logPublishEvent({
          accountId: updatedPost.accountId,
          postId: updatedPost.id,
          actionType: "wordpress_draft_sync_failed",
          status: "failed",
          detail: error instanceof Error ? error.message : "WordPress draft update failed"
        });

        return NextResponse.json(
          {
            ok: false,
            postId: updatedPost.id,
            message: error instanceof Error ? error.message : "WordPress draft update failed"
          },
          { status: 400 }
        );
      }
    }

    if (nextStatus === "scheduled") {
      await logPublishEvent({
        accountId: updatedPost.accountId,
        postId: updatedPost.id,
        actionType: "threads_schedule",
        status: "scheduled",
        detail: payload.requiresApproval
          ? "Threads 草稿已更新，到點後會先送 Telegram 給你確認"
          : `Threads 草稿已更新，預計 ${updatedPost.scheduledAt?.toLocaleString("zh-TW", { hour12: false }) ?? "稍後"} 發布`
      });
    }

    return NextResponse.json({
      ok: true,
      postId: updatedPost.id,
      message:
        nextStatus === "scheduled"
          ? payload.requiresApproval
            ? "Threads 草稿已更新，到點後會先送 Telegram 給你確認。"
            : "Threads 草稿已更新，會照排程送出。"
          : "Threads 草稿已更新。"
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Update failed"
      },
      { status: 400 }
    );
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const existingPost = await prisma.post.findUnique({
      where: { id },
      include: {
        account: true
      }
    });

    if (!existingPost) {
      return NextResponse.json({ ok: false, message: "找不到指定草稿" }, { status: 404 });
    }

    if (existingPost.status === "published") {
      return NextResponse.json({ ok: false, message: "已發布內容不可從這裡直接刪除。" }, { status: 400 });
    }

    await prisma.post.delete({
      where: { id }
    });

    return NextResponse.json({
      ok: true,
      message:
        existingPost.account.platform === "wordpress" && existingPost.platformPostId
          ? "已刪除本地草稿紀錄；WordPress 後台草稿若也要移除，請到站台後台手動刪除。"
          : "草稿已刪除。"
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Delete failed"
      },
      { status: 400 }
    );
  }
}
