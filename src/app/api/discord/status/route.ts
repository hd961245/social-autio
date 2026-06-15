import { NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/cron-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await authorizeCronRequest(request);
  if (!auth.ok) return NextResponse.json({ ok: false }, { status: 401 });

  try {
    await prisma.$queryRaw`SELECT 1`;

    const [threadsAccounts, wpAccounts, pendingDrafts, recentIngestions] = await Promise.all([
      prisma.platformAccount.count({ where: { platform: "threads", isActive: true } }),
      prisma.platformAccount.count({ where: { platform: "wordpress", isActive: true } }),
      prisma.post.count({ where: { status: "draft", contentType: "threads" } }),
      prisma.ingestionRecord.findFirst({
        where: { sourceType: "notion_inbox" },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true, title: true }
      })
    ]);

    return NextResponse.json({
      ok: true,
      db: "connected",
      threadsAccounts,
      wpAccounts,
      pendingDrafts,
      lastNotionIngestAt: recentIngestions?.createdAt ?? null,
      lastNotionIngestTitle: recentIngestions?.title ?? null
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      db: "error",
      message: error instanceof Error ? error.message : "status check failed"
    }, { status: 500 });
  }
}
