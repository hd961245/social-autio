import { NextResponse } from "next/server";
import { z } from "zod";
import { generateWritingProfileWithAi } from "@/lib/ai/gateway";
import { fetchWordPressPosts } from "@/lib/platforms/wordpress/client";
import { prisma } from "@/lib/prisma";

const styleProfileSchema = z.object({
  accountId: z.string().min(1),
  sampleSize: z.number().int().min(3).max(30).default(12)
});

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(request: Request) {
  try {
    const payload = styleProfileSchema.parse(await request.json());
    const settings = await prisma.appSettings.findFirst();
    const preferredProvider = (settings?.aiProvider?.trim() as "auto" | "gemini" | "claude" | "openai" | undefined) ?? "auto";
    const posts = await fetchWordPressPosts(payload.accountId, payload.sampleSize);

    if (!posts.length) {
      return NextResponse.json({ ok: false, message: "這個 WordPress 站台目前抓不到可分析的文章。" }, { status: 400 });
    }

    const samples = posts
      .filter((post) => post.status !== "trash")
      .map((post) => ({
        title: stripHtml(post.title?.rendered ?? "") || "未命名文章",
        excerpt: stripHtml(post.excerpt?.rendered ?? "").slice(0, 280),
        content: stripHtml(post.content?.rendered ?? "").slice(0, 2500),
        url: post.link
      }))
      .filter((post) => post.content);

    if (!samples.length) {
      return NextResponse.json({ ok: false, message: "文章內容為空，還無法建立寫作樣式。" }, { status: 400 });
    }

    const profile = await generateWritingProfileWithAi({
      samples,
      preferredProvider
    });

    const saved = await prisma.appSettings.upsert({
      where: { id: settings?.id ?? "seed-settings" },
      update: {
        writingStyleProfile: profile.writingStyleProfile,
        affiliateLinkPolicy: profile.affiliateLinkPolicy
      },
      create: {
        id: settings?.id ?? "seed-settings",
        writingStyleProfile: profile.writingStyleProfile,
        affiliateLinkPolicy: profile.affiliateLinkPolicy
      }
    });

    return NextResponse.json({
      ok: true,
      provider: profile.provider,
      analyzedCount: samples.length,
      writingStyleProfile: saved.writingStyleProfile,
      affiliateLinkPolicy: saved.affiliateLinkPolicy,
      message: "已根據你的 WordPress 舊文整理出寫作方式與聯盟連結規劃。"
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Style profile generation failed"
      },
      { status: 400 }
    );
  }
}
