import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { encryptString } from "@/lib/crypto";
import { toDisplayErrorMessage } from "@/lib/error-display";
import { prisma } from "@/lib/prisma";
import {
  exchangeCodeForShortLivedToken,
  exchangeForLongLivedToken,
  resolveInstagramAccount
} from "@/lib/platforms/instagram/oauth";
import { INSTAGRAM_STATE_COOKIE } from "@/lib/platforms/instagram/constants";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const searchParams = Object.fromEntries(url.searchParams.entries());
  const logDetailPrefix = `redirect=${url.origin}/api/auth/instagram/callback`;

  try {
    const oauthError = searchParams.error || searchParams.error_type;
    if (oauthError) {
      const cookieStore = await cookies();
      cookieStore.delete(INSTAGRAM_STATE_COOKIE);

      await prisma.automationLog.create({
        data: {
          actionType: "instagram_callback",
          status: "failed",
          detail: `${logDetailPrefix} | oauth_error=${oauthError} | ${searchParams.error_description ?? ""}`
        }
      }).catch(() => null);

      const redirectUrl = new URL("/accounts/connect", request.url);
      redirectUrl.searchParams.set("error", "instagram_oauth_error");
      redirectUrl.searchParams.set("error_code", String(oauthError));
      if (searchParams.error_description) {
        redirectUrl.searchParams.set("error_description", searchParams.error_description);
      }
      return NextResponse.redirect(redirectUrl);
    }

    const code = searchParams.code;
    const stateParam = searchParams.state;
    if (!code || !stateParam) {
      return NextResponse.redirect(new URL("/accounts/connect?error=missing_code_or_state", request.url));
    }

    const cookieStore = await cookies();
    const savedState = cookieStore.get(INSTAGRAM_STATE_COOKIE)?.value;
    if (!savedState || savedState !== stateParam) {
      cookieStore.delete(INSTAGRAM_STATE_COOKIE);
      await prisma.automationLog.create({
        data: {
          actionType: "instagram_callback",
          status: "failed",
          detail: `${logDetailPrefix} | invalid_oauth_state`
        }
      }).catch(() => null);
      return NextResponse.redirect(new URL("/accounts/connect?error=invalid_oauth_state", request.url));
    }

    // Exchange code → short-lived → long-lived user token
    const shortLived = await exchangeCodeForShortLivedToken(code);
    const longLived = await exchangeForLongLivedToken(shortLived);

    // Resolve IG Business Account linked to Facebook Page
    const igAccount = await resolveInstagramAccount(longLived.accessToken);

    const user = await prisma.user.upsert({
      where: { id: "seed-admin" },
      update: {},
      create: { id: "seed-admin", name: "Admin" }
    });

    const account = await prisma.platformAccount.upsert({
      where: {
        platform_platformUserId: {
          platform: "instagram",
          platformUserId: igAccount.igUserId
        }
      },
      update: {
        platformUsername: igAccount.username,
        profilePictureUrl: igAccount.profilePictureUrl,
        accessToken: encryptString(longLived.accessToken),
        tokenType: "long_lived",
        tokenExpiresAt: new Date(Date.now() + longLived.expiresIn * 1000),
        isActive: true,
        lastSyncedAt: new Date()
      },
      create: {
        userId: user.id,
        platform: "instagram",
        platformUserId: igAccount.igUserId,
        platformUsername: igAccount.username,
        profilePictureUrl: igAccount.profilePictureUrl,
        accessToken: encryptString(longLived.accessToken),
        tokenType: "long_lived",
        tokenExpiresAt: new Date(Date.now() + longLived.expiresIn * 1000),
        autoGenerateEnabled: false,
        autoGenerateMode: "scheduled",
        autoGenerateTime: "09:00",
        isActive: true,
        lastSyncedAt: new Date()
      }
    });

    await prisma.automationLog.create({
      data: {
        accountId: account.id,
        actionType: "instagram_callback",
        status: "executed",
        detail: `${logDetailPrefix} | igUserId=${igAccount.igUserId} | username=@${igAccount.username} | accountId=${account.id}`
      }
    }).catch(() => null);

    cookieStore.delete(INSTAGRAM_STATE_COOKIE);
    return NextResponse.redirect(new URL("/accounts?connected=instagram", request.url));
  } catch (error) {
    const { message, rawMessage } = toDisplayErrorMessage(error);

    await prisma.automationLog.create({
      data: {
        actionType: "instagram_callback",
        status: "failed",
        detail: `${logDetailPrefix} | ${rawMessage}`
      }
    }).catch(() => null);

    const redirectUrl = new URL("/accounts/connect", request.url);
    redirectUrl.searchParams.set("error", "instagram_callback_failed");
    redirectUrl.searchParams.set("message", message.slice(0, 180));
    return NextResponse.redirect(redirectUrl);
  }
}
