import { env } from "@/lib/env";
import { cookies } from "next/headers";

export const AUTH_COOKIE_NAME = "social-audio-session";

export function createSessionValue() {
  const secret = env.adminSessionSecret();
  return `authenticated:${secret}`;
}

export function verifySessionValue(value?: string | null) {
  if (!value) {
    return false;
  }

  return value === createSessionValue();
}

export function isValidAdminPassword(candidate: string) {
  const configured = env.adminPassword();
  return candidate === configured;
}

export async function hasAdminSession() {
  const cookieStore = await cookies();
  return verifySessionValue(cookieStore.get(AUTH_COOKIE_NAME)?.value);
}
