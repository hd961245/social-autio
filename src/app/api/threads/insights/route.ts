import { NextResponse } from "next/server";
import { getPlatformAdapter } from "@/lib/platforms";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const account = await prisma.platformAccount.findFirst({
    where: {
      isActive: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  if (!account) {
    return NextResponse.json({ ok: false, message: "尚未有可用帳號" }, { status: 404 });
  }

  const adapter = getPlatformAdapter("threads");
  const now = new Date();
  const metrics = await adapter.getUserMetrics(account.id, new Date(now.getTime() - 7 * 86400000), now);
  const quota = await adapter.getPublishingQuota(account.id);

  return NextResponse.json({
    ok: true,
    metrics,
    quota
  });
}
