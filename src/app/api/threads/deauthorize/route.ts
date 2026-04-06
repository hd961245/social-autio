import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type SignedRequestPayload = {
  user_id?: string;
};

function parseSignedRequest(signedRequest: string): SignedRequestPayload {
  const [, payload] = signedRequest.split(".");

  if (!payload) {
    return {};
  }

  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const decoded = Buffer.from(normalized, "base64").toString("utf8");

  return JSON.parse(decoded) as SignedRequestPayload;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const signedRequest = String(formData.get("signed_request") ?? "");
  const payload = signedRequest ? parseSignedRequest(signedRequest) : {};

  if (payload.user_id) {
    await prisma.platformAccount.updateMany({
      where: {
        platform: "threads",
        platformUserId: payload.user_id
      },
      data: {
        isActive: false
      }
    });
  }

  return NextResponse.json({ url: "https://social-audio.zeabur.app/login", confirmation_code: payload.user_id ?? "noop" });
}

