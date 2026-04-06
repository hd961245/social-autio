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
  return NextResponse.redirect(url);
}
