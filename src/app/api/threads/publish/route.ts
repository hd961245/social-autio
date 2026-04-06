import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabaseStatus } from "@/lib/dashboard-data";
import { getPlatformAdapter } from "@/lib/platforms";
import { prisma } from "@/lib/prisma";

const publishSchema = z.object({
  accountId: z.string().min(1),
  text: z.string().trim().min(1).max(100000),
  title: z.string().trim().max(200).optional(),
  excerpt: z.string().trim().max(500).optional(),
  html: z.string().trim().optional(),
  contentType: z.enum(["text", "image", "video", "carousel"]).default("text"),
  mediaUrls: z.array(z.string().url()).optional(),
  featuredImageUrl: z.string().url().optional(),
  categories: z.array(z.string().trim().min(1)).optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
  replyToPostId: z.string().trim().optional(),
  publishMode: z.enum(["immediate", "scheduled"]).default("immediate"),
  scheduledAt: z.string().datetime().optional()
});

export async function POST(request: Request) {
  try {
    const databaseStatus = await getDatabaseStatus();

    if (!databaseStatus.ready) {
      return NextResponse.json(
        {
          ok: false,
          message: "資料庫尚未初始化，請先在 Zeabur 執行 npm run db:push"
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const payload = publishSchema.parse(body);

    const account = await prisma.platformAccount.findUnique({
      where: {
        id: payload.accountId
      }
    });

    if (!account) {
      return NextResponse.json({ ok: false, message: "找不到指定帳號" }, { status: 404 });
    }

    if (account.platform === "threads" && payload.text.length > 500) {
      return NextResponse.json({ ok: false, message: "Threads 文字上限為 500 字" }, { status: 400 });
    }

    const createdPost = await prisma.post.create({
      data: {
        userId: account.userId,
        accountId: account.id,
        contentType: payload.contentType,
        title: payload.title,
        textContent: payload.text,
        htmlContent: payload.html ?? null,
        excerpt: payload.excerpt ?? null,
        mediaUrls: payload.mediaUrls?.length ? JSON.stringify(payload.mediaUrls) : null,
        featuredImageUrl: payload.featuredImageUrl ?? null,
        categories: payload.categories?.length ? JSON.stringify(payload.categories) : null,
        tags: payload.tags?.length ? JSON.stringify(payload.tags) : null,
        status: payload.publishMode === "scheduled" ? "scheduled" : "publishing",
        scheduledAt: payload.publishMode === "scheduled" && payload.scheduledAt ? new Date(payload.scheduledAt) : null,
        replyToPostId: payload.replyToPostId ?? null
      }
    });

    if (payload.publishMode === "scheduled") {
      return NextResponse.json({
        ok: true,
        scheduled: true,
        postId: createdPost.id
      });
    }

    try {
      const adapter = getPlatformAdapter(account.platform as "threads" | "wordpress");
      const result = await adapter.createPost(payload.accountId, {
        contentType: payload.contentType,
        title: payload.title,
        text: payload.text,
        html: payload.html,
        excerpt: payload.excerpt,
        mediaUrls: payload.mediaUrls,
        featuredImageUrl: payload.featuredImageUrl,
        categories: payload.categories,
        tags: payload.tags,
        replyToPostId: payload.replyToPostId
      });

      const post = await prisma.post.update({
        where: { id: createdPost.id },
        data: {
          status: "published",
          platformPostId: result.platformPostId,
          platformUrl: result.url,
          publishedAt: new Date()
        }
      });

      return NextResponse.json({
        ok: true,
        result,
        postId: post.id
      });
    } catch (error) {
      await prisma.post.update({
        where: { id: createdPost.id },
        data: {
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Unknown publish error"
        }
      });

      throw error;
    }
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Publish failed"
      },
      { status: 400 }
    );
  }
}
