import { threadsAdapter } from "@/lib/platforms/threads";
import type { PlatformAdapter, PlatformId } from "@/lib/platforms/types";

const adapters: Record<PlatformId, PlatformAdapter> = {
  threads: threadsAdapter,
  wordpress: threadsAdapter as unknown as PlatformAdapter,
  instagram: threadsAdapter as unknown as PlatformAdapter,
  twitter: threadsAdapter as unknown as PlatformAdapter
};

export function getPlatformAdapter(platformId: PlatformId) {
  return adapters[platformId];
}

