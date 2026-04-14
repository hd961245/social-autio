import { refreshSourceWatch } from "@/lib/content/source-watch";
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
