import { NextResponse } from "next/server";
import { z } from "zod";
import { encryptString } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

const connectSchema = z.object({
  siteUrl: z.string().url(),
  username: z.string().min(1),
  appPassword: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = connectSchema.parse(body);

    const user = await prisma.user.upsert({
      where: { id: "seed-admin" },
      update: {},
      create: {
        id: "seed-admin",
        name: "Admin"
      }
    });

    const normalizedSiteUrl = payload.siteUrl.replace(/\/$/, "");

    const account = await prisma.platformAccount.upsert({
      where: {
        platform_platformUserId: {
          platform: "wordpress",
          platformUserId: normalizedSiteUrl
        }
      },
      update: {
        platformUsername: payload.username,
        accessToken: encryptString(payload.appPassword),
        tokenType: "app_password",
        tokenExpiresAt: new Date("2099-12-31T00:00:00.000Z"),
        isActive: true,
        lastSyncedAt: new Date()
      },
      create: {
        userId: user.id,
        platform: "wordpress",
        platformUserId: normalizedSiteUrl,
        platformUsername: payload.username,
        accessToken: encryptString(payload.appPassword),
        tokenType: "app_password",
        tokenExpiresAt: new Date("2099-12-31T00:00:00.000Z"),
        isActive: true,
        lastSyncedAt: new Date()
      }
    });

    return NextResponse.json({ ok: true, accountId: account.id });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "WordPress connect failed" },
      { status: 400 }
    );
  }
}

