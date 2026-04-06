import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, verifySessionValue } from "@/lib/auth";

const protectedPrefixes = ["/dashboard", "/accounts", "/compose", "/posts", "/analytics", "/keywords", "/automation"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requiresAuth = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (!requiresAuth) {
    return NextResponse.next();
  }

  const session = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (verifySessionValue(session)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"]
};

