import { NextResponse } from "next/server";
import { ingestAndGenerateDrafts } from "@/lib/ai/content-engine";
import { refreshSourceCandidates, refreshSourceWatch } from "@/lib/content/source-watch";
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

    const candidates = await refreshSourceCandidates(watch.sourceType, watch.sourceUrl, watch.preferredOutcome === "threads" ? 6 : 3);
    const preview = candidates[0];

    if (!preview) {
      return NextResponse.json({ ok: false, message: "這個來源目前沒有可用文章。" }, { status: 400 });
    }
    const body = await request.json().catch(() => ({}));
    const preferredOutcome =
      body?.preferredOutcome === "threads" || body?.preferredOutcome === "wordpress"
        ? body.preferredOutcome
        : watch.preferredOutcome === "threads" || watch.preferredOutcome === "wordpress"
          ? watch.preferredOutcome
          : "threads";
    const targetThreadsAccountId =
      typeof body?.targetThreadsAccountId === "string" && body.targetThreadsAccountId.trim()
        ? body.targetThreadsAccountId.trim()
        : undefined;
    const dailyLimit = preferredOutcome === "threads" ? 3 : 1;
    const recentExisting = await prisma.ingestionRecord.findMany({
      where: {
        sourceUrl: {
          in: candidates.map((item) => item.url)
        }
      },
      select: {
        sourceUrl: true
      }
    });
    const existingUrls = new Set(recentExisting.map((item) => item.sourceUrl).filter(Boolean));
    const selectedItems = candidates.filter((item) => !existingUrls.has(item.url)).slice(0, dailyLimit);

    if (selectedItems.length === 0) {
      return NextResponse.json({
        ok: true,
        duplicated: true,
        message: preferredOutcome === "threads" ? "最近幾篇來源都已經改寫過，今天不重複建候選稿。" : "這篇最新內容之前已經改寫過了。",
        preview
      });
    }

    let generatedDraftCount = 0;
    for (const item of selectedItems) {
      const result = await ingestAndGenerateDrafts({
        sourceType: "url",
        sourceUrl: item.url,
        title: item.title,
        rawText: item.excerpt,
        threadsAccountId: preferredOutcome === "threads" ? targetThreadsAccountId : undefined,
        wordpressTemplate: preferredOutcome === "wordpress" ? "case-study" : "opinion",
        outputMode: preferredOutcome
      });
      generatedDraftCount += result.generatedDrafts.length;
    }

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
          increment: selectedItems.length
        },
        threadsPickCount:
          preferredOutcome === "threads"
            ? {
                increment: selectedItems.length
              }
            : undefined,
        wordpressPickCount:
            preferredOutcome === "wordpress"
              ? {
                  increment: selectedItems.length
                }
              : undefined,
        lastError: null
      }
    });

    return NextResponse.json({
      ok: true,
      message:
        preferredOutcome === "threads"
          ? `已從來源挑出 ${selectedItems.length} 篇，建立成待確認的 Threads 候選稿。`
          : `已從來源建立 ${selectedItems.length} 篇 WordPress 草稿。`,
      generatedDraftCount,
      picked: selectedItems.length,
      preview
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Import failed" },
      { status: 400 }
    );
  }
}
