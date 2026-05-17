import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getPlatformAdapter } from "@/lib/platforms";
import { THREADS_STATE_COOKIE } from "@/lib/platforms/threads/constants";

export async function GET() {
  const state = randomUUID();
  const cookieStore = await cookies();
  cookieStore.set(THREADS_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 10
  });

  const url = getPlatformAdapter("threads").getAuthorizationUrl(state);

  const configuredRedirectUri = process.env.THREADS_REDIRECT_URI ?? "(not set)";
  const callbackRoutePath = "/api/threads/callback";
  const actualAuthorizationUrl = url.replace(/client_secret=[^&]*/g, "client_secret=REDACTED");
  console.log("[threads/authorize] configuredRedirectUri:", configuredRedirectUri);
  console.log("[threads/authorize] callbackRoutePath:", callbackRoutePath);
  console.log("[threads/authorize] actualAuthorizationUrl:", actualAuthorizationUrl);
  console.log("[threads/authorize] APP_BASE_URL:", process.env.APP_BASE_URL ?? "(not set)");

  return NextResponse.redirect(url);
}
