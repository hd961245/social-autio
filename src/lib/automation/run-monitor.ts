import { prisma } from "@/lib/prisma";

export type AutomationRuntimeAction = "ops_heartbeat" | "ops_scheduler";

export async function logAutomationRuntime(input: {
  actionType: AutomationRuntimeAction;
  status: "executed" | "failed";
  detail: string;
}) {
  try {
    await prisma.automationLog.create({
      data: {
        actionType: input.actionType,
        status: input.status,
        detail: input.detail
      }
    });
  } catch {}
}

