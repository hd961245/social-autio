import { hydrateSourceCandidate, refreshSourceCandidates, refreshSourceWatch } from "@/lib/content/source-watch";
import { ingestAndGenerateDrafts } from "@/lib/ai/content-engine";
import { prisma } from "@/lib/prisma";

function getBatchLimit(envKey: string, fallback: number) {
  const parsed = Number(process.env[envKey] ?? "");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function refreshAllSourceWatches() {
  const refreshLimit = getBatchLimit("SOURCE_REFRESH_BATCH_LIMIT", 20);
  const watches = await prisma.sourceWatch.findMany({
    where: { isActive: true },
    orderBy: { updatedAt: "desc" },
    take: refreshLimit
  });

  const results = [];

  for (const watch of watches) {
    try {
      const preview = await refreshSourceWatch(watch.sourceType, watch.sourceUrl);
      const sameItem = preview.fingerprint === watch.lastItemFingerprint;

      await prisma.sourceWatch.update({
        where: { id: watch.id },
        data: {
          lastFetchedAt: new Date(),
          lastItemTitle: preview.title,
          lastItemUrl: preview.url,
          lastExcerpt: preview.excerpt,
          lastItemFingerprint: preview.fingerprint,
          lastHandledStatus: sameItem ? watch.lastHandledStatus ?? "new" : "new",
          lastError: null
        }
      });

      results.push({ id: watch.id, ok: true, changed: !sameItem });
    } catch (error) {
      await prisma.sourceWatch.update({
        where: { id: watch.id },
        data: {
          lastError: error instanceof Error ? error.message : "Refresh failed"
        }
      });
      results.push({ id: watch.id, ok: false });
    }
  }

  return {
    total: watches.length,
    results
  };
}

export async function runDailySourceImports() {
  const importLimit = getBatchLimit("SOURCE_IMPORT_BATCH_LIMIT", 10);
  const watches = await prisma.sourceWatch.findMany({
    where: {
      isActive: true,
      autoImportEnabled: true
    },
    orderBy: { updatedAt: "desc" },
    take: importLimit
  });

  const results = [];

  for (const watch of watches) {
    try {
      const candidates = await refreshSourceCandidates(watch.sourceType, watch.sourceUrl, watch.preferredOutcome === "threads" ? 6 : 3);
      const preview = candidates[0];

      if (!preview) {
        results.push({ id: watch.id, ok: true, imported: false, reason: "no-candidates" });
        continue;
      }

      const sameItem = preview.fingerprint === watch.lastItemFingerprint;

      const preferredOutcome =
        watch.preferredOutcome === "wordpress" || watch.preferredOutcome === "threads"
          ? watch.preferredOutcome
          : "threads";
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
        await prisma.sourceWatch.update({
          where: { id: watch.id },
          data: {
            lastFetchedAt: new Date(),
            lastItemTitle: preview.title,
            lastItemUrl: preview.url,
            lastExcerpt: preview.excerpt,
            lastItemFingerprint: preview.fingerprint,
            lastHandledStatus: sameItem ? watch.lastHandledStatus ?? "skipped" : "skipped",
            lastHandledAt: new Date(),
            skipCount: {
              increment: 1
            },
            lastError: null
          }
        });

        results.push({ id: watch.id, ok: true, imported: false, reason: "already-imported" });
        continue;
      }

      const hydratedItems = await Promise.all(selectedItems.map((item) => hydrateSourceCandidate(item)));
      let generatedDraftCount = 0;
      for (const item of hydratedItems) {
        const result = await ingestAndGenerateDrafts({
          sourceType: "url",
          sourceUrl: item.url,
          title: item.normalizedTitle || item.title,
          rawText: item.normalizedText || item.normalizedExcerpt || item.excerpt,
          wordpressTemplate: preferredOutcome === "wordpress" ? "case-study" : "opinion",
          outputMode: preferredOutcome,
          sourceNote: item.rationale
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

      results.push({
        id: watch.id,
        ok: true,
        imported: true,
        picked: selectedItems.length,
        drafts: generatedDraftCount
      });
    } catch (error) {
      await prisma.sourceWatch.update({
        where: { id: watch.id },
        data: {
          lastError: error instanceof Error ? error.message : "Daily import failed"
        }
      });
      results.push({ id: watch.id, ok: false });
    }
  }

  return {
    total: watches.length,
    imported: results.filter((item) => item.ok && item.imported).length,
    results
  };
}
