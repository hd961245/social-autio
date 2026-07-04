import { threadsAdapter } from "@/lib/platforms/threads";
import { wordpressAdapter } from "@/lib/platforms/wordpress";
import { instagramAdapter } from "@/lib/platforms/instagram";
import type { PlatformAdapter, PlatformId } from "@/lib/platforms/types";

const adapters: Record<PlatformId, PlatformAdapter> = {
  threads: threadsAdapter,
  wordpress: wordpressAdapter,
  instagram: instagramAdapter,
  twitter: threadsAdapter as unknown as PlatformAdapter
};

export function getPlatformAdapter(platformId: PlatformId) {
  return adapters[platformId];
}
