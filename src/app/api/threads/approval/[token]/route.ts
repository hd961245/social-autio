import { NextResponse } from "next/server";
import { applyApprovalDecision } from "@/lib/threads-approval";

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (action !== "approve" && action !== "reject") {
    return new Response("Invalid approval action", { status: 400 });
  }

  try {
    const result = await applyApprovalDecision(token, action);
    const target = `/posts?approval=${result.status}`;
    return NextResponse.redirect(new URL(target, request.url));
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "Approval failed", { status: 400 });
  }
}
