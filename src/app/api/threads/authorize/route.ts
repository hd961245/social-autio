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

  // ── Diagnostic log (no secrets) ──────────────────────────────────
  const safeUrl = url
    .replace(/client_secret=[^&]*/g, "client_secret=REDACTED")
    .replace(/access_token=[^&]*/g, "access_token=REDACTED");
  console.log("[threads/authorize] NODE_ENV:", process.env.NODE_ENV ?? "(not set)");
  console.log("[threads/authorize] APP_BASE_URL:", process.env.APP_BASE_URL ?? "(not set)");
  console.log("[threads/authorize] THREADS_REDIRECT_URI (raw):", process.env.THREADS_REDIRECT_URI ?? "(not set — auto-built from APP_BASE_URL)");
  console.log("[threads/authorize] configuredRedirectUri (resolved):", new URL(url).searchParams.get("redirect_uri"));
  console.log("[threads/authorize] callbackRoutePath: /api/auth/threads/callback");
  console.log("[threads/authorize] actualAuthorizationUrl:", safeUrl);
  // ─────────────────────────────────────────────────────────────────

  return NextResponse.redirect(url);
}
