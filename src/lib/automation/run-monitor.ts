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

export async function getLatestAutomationRuntimeStatus() {
  try {
    const logs = await prisma.automationLog.findMany({
      where: {
        actionType: {
          in: ["ops_heartbeat", "ops_scheduler"]
        }
      },
      orderBy: {
        executedAt: "desc"
      },
      take: 12
    });

    const latestHeartbeat = logs.find((log) => log.actionType === "ops_heartbeat") ?? null;
    const latestScheduler = logs.find((log) => log.actionType === "ops_scheduler") ?? null;
    const latestFailure = logs.find((log) => log.status === "failed") ?? null;

    return {
      ok: true,
      latestHeartbeat: latestHeartbeat
        ? {
            status: latestHeartbeat.status,
            detail: latestHeartbeat.detail,
            executedAt: latestHeartbeat.executedAt.toISOString()
          }
        : null,
      latestScheduler: latestScheduler
        ? {
            status: latestScheduler.status,
            detail: latestScheduler.detail,
            executedAt: latestScheduler.executedAt.toISOString()
          }
        : null,
      latestFailure: latestFailure
        ? {
            actionType: latestFailure.actionType,
            detail: latestFailure.detail,
            executedAt: latestFailure.executedAt.toISOString()
          }
        : null
    };
  } catch {
    return {
      ok: false,
      latestHeartbeat: null,
      latestScheduler: null,
      latestFailure: null
    };
  }
}
