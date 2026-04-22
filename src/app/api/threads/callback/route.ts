import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { encryptString } from "@/lib/crypto";
import { toDisplayErrorMessage } from "@/lib/error-display";
import { prisma } from "@/lib/prisma";
import { getPlatformAdapter } from "@/lib/platforms";
import { THREADS_STATE_COOKIE } from "@/lib/platforms/threads/constants";
import { getThreadsProfile, parseThreadsCallback } from "@/lib/platforms/threads/oauth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const searchParams = Object.fromEntries(url.searchParams.entries());
  const logDetailPrefix = `redirect=${url.origin}/api/threads/callback`;

  try {
    const payload = parseThreadsCallback(searchParams);
    const cookieStore = await cookies();
    const state = cookieStore.get(THREADS_STATE_COOKIE)?.value;

    if (!state || state !== payload.state) {
      await prisma.automationLog.create({
        data: {
          actionType: "threads_callback",
          status: "failed",
          detail: `${logDetailPrefix} | invalid_oauth_state`
        }
      }).catch(() => null);

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

    const account = await prisma.platformAccount.upsert({
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

    await prisma.automationLog.create({
      data: {
        accountId: account.id,
        actionType: "threads_callback",
        status: "executed",
        detail: `${logDetailPrefix} | profileId=${profile.id} | username=@${profile.username} | accountId=${account.id}`
      }
    }).catch(() => null);

    cookieStore.delete(THREADS_STATE_COOKIE);

    return NextResponse.redirect(new URL("/accounts?connected=threads", request.url));
  } catch (error) {
    const { message, rawMessage } = toDisplayErrorMessage(error);

    await prisma.automationLog.create({
      data: {
        actionType: "threads_callback",
        status: "failed",
        detail: `${logDetailPrefix} | ${rawMessage}`
      }
    }).catch(() => null);

    return NextResponse.json({
      ok: false,
      message
    }, { status: 400 });
  }
}
