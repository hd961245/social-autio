const cache = new Map<string, { value: unknown; expiresAt: number }>();

export async function withRuntimeCache<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.value as T;
  }
  const value = await fn();
  cache.set(key, { value, expiresAt: now + ttlMs });
  return value;
}
