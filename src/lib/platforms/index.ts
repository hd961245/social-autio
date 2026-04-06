import { threadsAdapter } from "@/lib/platforms/threads";
import { wordpressAdapter } from "@/lib/platforms/wordpress";
import type { PlatformAdapter, PlatformId } from "@/lib/platforms/types";

const adapters: Record<PlatformId, PlatformAdapter> = {
  threads: threadsAdapter,
  wordpress: wordpressAdapter,
  instagram: threadsAdapter as unknown as PlatformAdapter,
  twitter: threadsAdapter as unknown as PlatformAdapter
};

export function getPlatformAdapter(platformId: PlatformId) {
  return adapters[platformId];
}
