import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

export async function POST() {
  const confirmationCode = randomUUID();

  return NextResponse.json({
    url: `https://social-audio.zeabur.app/login?deletion_request=${confirmationCode}`,
    confirmation_code: confirmationCode
  });
}
