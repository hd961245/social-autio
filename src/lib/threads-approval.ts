import { randomUUID } from "node:crypto";
import { env } from "@/lib/env";
import { logPublishEvent } from "@/lib/publish-log";
import { prisma } from "@/lib/prisma";
import { isTelegramConfigured, sendTelegramMessage } from "@/lib/telegram";

function truncate(value: string, max = 280) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > max ? `${normalized.slice(0, max - 1)}…` : normalized;
}

function approvalUrl(token: string, action: "approve" | "reject") {
  const baseUrl = env.appBaseUrl();

  if (!baseUrl) {
    throw new Error("缺少 APP_BASE_URL，無法建立 approval 連結。");
  }

  return `${baseUrl}/api/threads/approval/${token}?action=${action}`;
}

export async function requestThreadsApproval(postId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      account: true
    }
  });

  if (!post) {
    throw new Error("找不到指定的排程貼文。");
  }

  if (!post.requiresApproval) {
    return { requested: false, reason: "approval-not-required" as const };
  }

  if (!isTelegramConfigured()) {
    throw new Error("Telegram 尚未設定，請先補 TELEGRAM_BOT_TOKEN 與 TELEGRAM_CHAT_ID。");
  }

  const token = post.approvalToken ?? randomUUID();
  const scheduledLabel = post.scheduledAt?.toLocaleString("zh-TW", { hour12: false }) ?? "現在";
  const body = [
    "Threads 待確認發文",
    `帳號：@${post.account.platformUsername}`,
    `預計時間：${scheduledLabel}`,
    "",
    truncate(post.textContent ?? "", 800)
  ]
    .filter(Boolean)
    .join("\n");

  await sendTelegramMessage({
    text: body,
    buttons: [
      { text: "批准發布", url: approvalUrl(token, "approve") },
      { text: "先不要發", url: approvalUrl(token, "reject") }
    ]
  });

  await prisma.post.update({
    where: { id: post.id },
    data: {
      approvalState: "requested",
      approvalToken: token,
      approvalRequestedAt: new Date(),
      errorMessage: "Waiting for Telegram approval",
      status: "awaiting_approval"
    }
  });

  await logPublishEvent({
    accountId: post.accountId,
    postId: post.id,
    actionType: "threads_approval_requested",
    status: "scheduled",
    detail: "已送出 Telegram 確認訊息，等待批准後發布"
  });

  return { requested: true, token };
}

export async function applyApprovalDecision(token: string, action: "approve" | "reject") {
  const post = await prisma.post.findFirst({
    where: { approvalToken: token },
    include: {
      account: true
    }
  });

  if (!post) {
    throw new Error("找不到這筆待確認的 Threads 排程。");
  }

  if (action === "approve") {
    await prisma.post.update({
      where: { id: post.id },
      data: {
        approvalState: "approved",
        approvalToken: null,
        approvalDecisionAt: new Date(),
        errorMessage: null,
        status: "scheduled"
      }
    });

    await logPublishEvent({
      accountId: post.accountId,
      postId: post.id,
      actionType: "threads_approval_approved",
      status: "executed",
      detail: "已透過 Telegram 批准，等待 scheduler 送出"
    });

    return {
      ok: true,
      status: "approved" as const,
      postId: post.id
    };
  }

  await prisma.post.update({
    where: { id: post.id },
    data: {
      approvalState: "rejected",
      approvalToken: null,
      approvalDecisionAt: new Date(),
      errorMessage: "Rejected from Telegram approval",
      status: "approval_rejected"
    }
  });

  await logPublishEvent({
    accountId: post.accountId,
    postId: post.id,
    actionType: "threads_approval_rejected",
    status: "failed",
    detail: "已透過 Telegram 拒絕這篇排程"
  });

  return {
    ok: true,
    status: "rejected" as const,
    postId: post.id
  };
}
