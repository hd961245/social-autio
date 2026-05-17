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
  const logDetailPrefix = `redirect=${url.origin}/api/auth/threads/callback`;

  try {
    const oauthError = searchParams.error || searchParams.error_type;
    const oauthErrorReason = searchParams.error_reason;
    const oauthErrorDescription = searchParams.error_description;

    if (oauthError) {
      const cookieStore = await cookies();
      cookieStore.delete(THREADS_STATE_COOKIE);

      const detail = [
        logDetailPrefix,
        `oauth_error=${oauthError}`,
        oauthErrorReason ? `reason=${oauthErrorReason}` : null,
        oauthErrorDescription ? `description=${oauthErrorDescription}` : null
      ]
        .filter(Boolean)
        .join(" | ");

      await prisma.automationLog.create({
        data: {
          actionType: "threads_callback",
          status: "failed",
          detail
        }
      }).catch(() => null);

      const redirectUrl = new URL("/accounts/connect", request.url);
      redirectUrl.searchParams.set("error", "threads_oauth_error");
      redirectUrl.searchParams.set("error_code", String(oauthError));
      if (oauthErrorReason) redirectUrl.searchParams.set("error_reason", oauthErrorReason);
      if (oauthErrorDescription) redirectUrl.searchParams.set("error_description", oauthErrorDescription);
      return NextResponse.redirect(redirectUrl);
    }

    const payload = parseThreadsCallback(searchParams);
    const cookieStore = await cookies();
    const state = cookieStore.get(THREADS_STATE_COOKIE)?.value;

    if (!state || state !== payload.state) {
      cookieStore.delete(THREADS_STATE_COOKIE);
      await prisma.automationLog.create({
        data: {
          actionType: "threads_callback",
          status: "failed",
          detail: `${logDetailPrefix} | invalid_oauth_state`
        }
      }).catch(() => null);

      return NextResponse.redirect(new URL("/accounts/connect?error=invalid_oauth_state", request.url));
    }

    const adapter = getPlatformAdapter("threads");
    const token = await adapter.exchangeCodeForToken(payload.code);
    const profile = await getThreadsProfile(token.accessToken);
    const settings = await prisma.appSettings.findFirst();
    const defaultAutopilotEnabled = settings?.autopilotMode !== "review_only";

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
        autoGenerateEnabled: defaultAutopilotEnabled,
        autoGenerateMode: "scheduled",
        autoGenerateTime: "09:00",
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

    const redirectUrl = new URL("/accounts/connect", request.url);
    redirectUrl.searchParams.set("error", "threads_callback_failed");
    redirectUrl.searchParams.set("message", message.slice(0, 180));
    return NextResponse.redirect(redirectUrl);
  }
}
