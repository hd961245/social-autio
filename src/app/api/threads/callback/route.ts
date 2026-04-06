import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { encryptString } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { getPlatformAdapter } from "@/lib/platforms";
import { THREADS_STATE_COOKIE } from "@/lib/platforms/threads/constants";
import { getThreadsProfile, parseThreadsCallback } from "@/lib/platforms/threads/oauth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const searchParams = Object.fromEntries(url.searchParams.entries());

  try {
    const payload = parseThreadsCallback(searchParams);
    const cookieStore = await cookies();
    const state = cookieStore.get(THREADS_STATE_COOKIE)?.value;

    if (!state || state !== payload.state) {
      return NextResponse.redirect(new URL("/accounts?error=invalid_oauth_state", request.url));
    }

    const adapter = getPlatformAdapter("threads");
    const token = await adapter.exchangeCodeForToken(payload.code);
    const profile = await getThreadsProfile(token.accessToken);

    const user = await prisma.user.upsert({
      where: { id: "seed-admin" },
      update: {},
      create: {
        id: "seed-admin",
        name: "Admin"
      }
    });

    await prisma.platformAccount.upsert({
      where: {
        platform_platformUserId: {
          platform: "threads",
          platformUserId: profile.id
        }
      },
      update: {
        platformUsername: profile.username,
        profilePictureUrl: profile.threads_profile_picture_url,
        accessToken: encryptString(token.accessToken),
        tokenType: token.tokenType,
        tokenExpiresAt: token.expiresAt,
        isActive: true,
        lastSyncedAt: new Date()
      },
      create: {
        userId: user.id,
        platform: "threads",
        platformUserId: profile.id,
        platformUsername: profile.username,
        profilePictureUrl: profile.threads_profile_picture_url,
        accessToken: encryptString(token.accessToken),
        tokenType: token.tokenType,
        tokenExpiresAt: token.expiresAt,
        isActive: true,
        lastSyncedAt: new Date()
      }
    });

    cookieStore.delete(THREADS_STATE_COOKIE);

    return NextResponse.redirect(new URL("/accounts?connected=threads", request.url));
  } catch (error) {
    return NextResponse.json({
      ok: false,
      message: error instanceof Error ? error.message : "Invalid callback payload"
    }, { status: 400 });
  }
}
