import { NextResponse } from "next/server";
import { z } from "zod";
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
  scheduledAt: z.string().datetime().optional()
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

    const nextStatus =
      existingPost.account.platform === "wordpress"
        ? "draft"
        : payload.publishMode === "scheduled"
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
        scheduledAt: nextStatus === "scheduled" && payload.scheduledAt ? new Date(payload.scheduledAt) : null,
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
              })
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
              });

        await prisma.post.update({
          where: { id: updatedPost.id },
          data: {
            platformPostId: result.platformPostId,
            platformUrl: result.url ?? null,
            errorMessage: null
          }
        });

        return NextResponse.json({
          ok: true,
          postId: updatedPost.id,
          message: "WordPress 草稿已更新。"
        });
      } catch (error) {
        await prisma.post.update({
          where: { id: updatedPost.id },
          data: {
            errorMessage: error instanceof Error ? error.message : "WordPress draft update failed"
          }
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

    return NextResponse.json({
      ok: true,
      postId: updatedPost.id,
      message: nextStatus === "scheduled" ? "Threads 草稿已更新，會照排程送出。" : "Threads 草稿已更新。"
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
