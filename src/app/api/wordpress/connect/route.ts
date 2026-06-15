import { NextResponse } from "next/server";
import { z } from "zod";
import { encryptString } from "@/lib/crypto";
import { diagnoseWordPressConnection, wordpressFetch } from "@/lib/platforms/wordpress/client";
import { prisma } from "@/lib/prisma";

const connectSchema = z.object({
  siteUrl: z.string().url(),
  username: z.string().min(1),
  appPassword: z.string().min(1),
  force: z.boolean().optional().default(false)
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

    let resolvedUsername = payload.username;

    if (!payload.force) {
      const diagnostic = await diagnoseWordPressConnection(normalizedSiteUrl, payload.username, payload.appPassword);

      if (!diagnostic.ok) {
        return NextResponse.json(
          {
            ok: false,
            stage: diagnostic.stage,
            message: diagnostic.message,
            hints: [
              ...diagnostic.hints,
              "如果你的主機封鎖了外部 IP，可以改用「強制儲存」跳過網路測試直接存入憑證。"
            ]
          },
          { status: 400 }
        );
      }

      const profile = await wordpressFetch<{ name?: string; slug?: string }>(
        normalizedSiteUrl,
        payload.username,
        payload.appPassword,
        "/wp-json/wp/v2/users/me"
      );
      resolvedUsername = profile.slug ?? payload.username;
    }

    const account = await prisma.platformAccount.upsert({
      where: {
        platform_platformUserId: {
          platform: "wordpress",
          platformUserId: normalizedSiteUrl
        }
      },
      update: {
        platformUsername: resolvedUsername,
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
        platformUsername: resolvedUsername,
        accessToken: encryptString(payload.appPassword),
        tokenType: "app_password",
        tokenExpiresAt: new Date("2099-12-31T00:00:00.000Z"),
        profilePictureUrl: null,
        isActive: true,
        lastSyncedAt: new Date()
      }
    });

    return NextResponse.json({ ok: true, accountId: account.id });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "WordPress connect failed",
        hints: ["如果還是失敗，先用瀏覽器打開 /wp-json/，再重新產生一組 Application Password。"]
      },
      { status: 400 }
    );
  }
}
