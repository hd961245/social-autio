import { NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/cron-auth";

export async function GET(request: Request) {
  const auth = await authorizeCronRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }

  const appBaseUrl =
    process.env.APP_BASE_URL?.trim() ||
    process.env.INNGEST_SERVE_ORIGIN?.trim() ||
    "http://localhost:3000";

  const computedRedirectUri =
    process.env.THREADS_REDIRECT_URI?.trim() ||
    `${appBaseUrl}/api/auth/threads/callback`;

  return NextResponse.json({
    APP_URL: process.env.APP_URL ?? null,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? null,
    BASE_URL: process.env.BASE_URL ?? null,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? null,
    THREADS_REDIRECT_URI: process.env.THREADS_REDIRECT_URI ?? null,
    APP_BASE_URL: process.env.APP_BASE_URL ?? null,
    NODE_ENV: process.env.NODE_ENV ?? null,
    computedRedirectUri,
    callbackRoutePath: "/api/auth/threads/callback"
  });
}
