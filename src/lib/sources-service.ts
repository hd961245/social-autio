import { refreshSourceWatch } from "@/lib/content/source-watch";
import { ingestAndGenerateDrafts } from "@/lib/ai/content-engine";
import { prisma } from "@/lib/prisma";

export async function refreshAllSourceWatches() {
  const watches = await prisma.sourceWatch.findMany({
    where: { isActive: true },
    orderBy: { updatedAt: "desc" }
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
  const watches = await prisma.sourceWatch.findMany({
    where: {
      isActive: true,
      autoImportEnabled: true
    },
    orderBy: { updatedAt: "desc" }
  });

  const results = [];

  for (const watch of watches) {
    try {
      const preview = await refreshSourceWatch(watch.sourceType, watch.sourceUrl);
      const sameItem = preview.fingerprint === watch.lastItemFingerprint;

      if (sameItem && watch.lastHandledStatus === "imported") {
        results.push({ id: watch.id, ok: true, imported: false, reason: "already-imported" });
        continue;
      }

      const preferredOutcome =
        watch.preferredOutcome === "wordpress" || watch.preferredOutcome === "threads"
          ? watch.preferredOutcome
          : "threads";

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

      results.push({
        id: watch.id,
        ok: true,
        imported: true,
        drafts: result.generatedDrafts.length
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
