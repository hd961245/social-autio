import { prisma } from "@/lib/prisma";

type PublishLogInput = {
  accountId: string;
  postId: string;
  actionType:
    | "threads_publish"
    | "threads_schedule"
    | "threads_publish_failed"
    | "threads_scheduled_publish"
    | "threads_scheduled_failed"
    | "wordpress_draft_sync"
    | "wordpress_draft_sync_failed";
  status: "scheduled" | "executed" | "failed";
  detail: string;
};

export async function logPublishEvent(input: PublishLogInput) {
  try {
    await prisma.automationLog.create({
      data: {
        accountId: input.accountId,
        postId: input.postId,
        actionType: input.actionType,
        status: input.status,
        detail: input.detail
      }
    });
  } catch {}
}
