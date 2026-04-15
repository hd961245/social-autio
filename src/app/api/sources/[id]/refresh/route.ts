import { NextResponse } from "next/server";
import { ingestAndGenerateDrafts } from "@/lib/ai/content-engine";
import { refreshSourceWatch } from "@/lib/content/source-watch";
import { prisma } from "@/lib/prisma";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const watch = await prisma.sourceWatch.findUnique({
      where: { id }
    });

    if (!watch) {
      return NextResponse.json({ ok: false, message: "找不到這個來源。" }, { status: 404 });
    }

    const preview = await refreshSourceWatch(watch.sourceType, watch.sourceUrl);

    await prisma.sourceWatch.update({
      where: { id: watch.id },
      data: {
        lastFetchedAt: new Date(),
        lastItemTitle: preview.title,
        lastItemUrl: preview.url,
        lastExcerpt: preview.excerpt,
        lastItemFingerprint: preview.fingerprint,
        lastHandledStatus: preview.fingerprint === watch.lastItemFingerprint ? watch.lastHandledStatus ?? "new" : "new",
        lastError: null
      }
    });

    return NextResponse.json({
      ok: true,
      preview
    });
  } catch (error) {
    await prisma.sourceWatch.updateMany({
      where: { id },
      data: {
        lastError: error instanceof Error ? error.message : "Refresh failed"
      }
    });

    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Refresh failed" },
      { status: 400 }
    );
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const watch = await prisma.sourceWatch.findUnique({
      where: { id }
    });

    if (!watch) {
      return NextResponse.json({ ok: false, message: "找不到這個來源。" }, { status: 404 });
    }

    const preview = await refreshSourceWatch(watch.sourceType, watch.sourceUrl);
    const sameItem = preview.fingerprint === watch.lastItemFingerprint;

    if (sameItem && watch.lastHandledStatus === "imported") {
      return NextResponse.json({
        ok: true,
        duplicated: true,
        message: "這篇最新內容之前已經改寫過了。",
        preview
      });
    }
    const body = await request.json().catch(() => ({}));
    const preferredOutcome =
      body?.preferredOutcome === "threads" || body?.preferredOutcome === "wordpress" ? body.preferredOutcome : "threads";
    const result = await ingestAndGenerateDrafts({
      sourceType: "url",
      sourceUrl: preview.url,
      title: preview.title,
      rawText: preview.excerpt,
      wordpressTemplate: preferredOutcome === "wordpress" ? "case-study" : "opinion"
    });

    await prisma.sourceWatch.update({
      where: { id: watch.id },
      data: {
        lastFetchedAt: new Date(),
        lastItemTitle: preview.title,
        lastItemUrl: preview.url,
        lastExcerpt: preview.excerpt,
        lastItemFingerprint: preview.fingerprint,
        lastHandledStatus: "imported",
        lastHandledAt: new Date(),
        importCount: {
          increment: 1
        },
        threadsPickCount:
          preferredOutcome === "threads"
            ? {
                increment: 1
              }
            : undefined,
        wordpressPickCount:
          preferredOutcome === "wordpress"
            ? {
                increment: 1
              }
            : undefined,
        lastError: null
      }
    });

    return NextResponse.json({
      ok: true,
      message: "已從來源建立新的草稿。",
      ...result,
      preview
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Import failed" },
      { status: 400 }
    );
  }
}
