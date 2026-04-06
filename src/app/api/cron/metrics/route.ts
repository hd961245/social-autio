import { NextResponse } from "next/server";
import { collectMetricsSnapshots, refreshExpiringTokens } from "@/lib/metrics-service";

export async function POST() {
  try {
    const [metrics, tokenRefresh] = await Promise.all([collectMetricsSnapshots(), refreshExpiringTokens()]);

    return NextResponse.json({
      ok: true,
      metrics,
      tokenRefresh
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Metrics collection failed"
      },
      { status: 500 }
    );
  }
}
