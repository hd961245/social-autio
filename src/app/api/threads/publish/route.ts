import { NextResponse } from "next/server";
import { z } from "zod";
import { getPlatformAdapter } from "@/lib/platforms";
import { prisma } from "@/lib/prisma";

const publishSchema = z.object({
  accountId: z.string().min(1),
  text: z.string().trim().min(1).max(500),
  contentType: z.enum(["text", "image", "video", "carousel"]).default("text"),
  mediaUrls: z.array(z.string().url()).optional()
});

export async function POST(request: Request) {
  try {
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

    const adapter = getPlatformAdapter("threads");

    const createdPost = await prisma.post.create({
      data: {
        userId: account.userId,
        accountId: account.id,
        contentType: payload.contentType,
        textContent: payload.text,
        mediaUrls: payload.mediaUrls?.length ? JSON.stringify(payload.mediaUrls) : null,
        status: "publishing"
      }
    });

    try {
      const result = await adapter.createPost(payload.accountId, {
        contentType: payload.contentType,
        text: payload.text,
        mediaUrls: payload.mediaUrls
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

