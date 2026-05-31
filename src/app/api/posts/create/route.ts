import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { textContent, scheduledAt } = await req.json();
    if (!textContent?.trim()) {
      return NextResponse.json({ ok: false, message: "內容不可為空" }, { status: 400 });
    }

    const user = await prisma.user.findFirst();
    const account = await prisma.platformAccount.findFirst({
      where: { platform: "threads", isActive: true }
    });
    if (!user || !account) {
      return NextResponse.json({ ok: false, message: "找不到帳號" }, { status: 400 });
    }

    const status = scheduledAt ? "scheduled" : "draft";
    const post = await prisma.post.create({
      data: {
        userId: user.id,
        accountId: account.id,
        contentType: "text",
        textContent: textContent.trim(),
        status,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null
      }
    });

    return NextResponse.json({ ok: true, id: post.id, status });
  } catch (e) {
    return NextResponse.json({ ok: false, message: String(e) }, { status: 500 });
  }
}
