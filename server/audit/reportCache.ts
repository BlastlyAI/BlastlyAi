/** In-memory audit report cache for dev / when Supabase is unavailable. */
const cache = new Map<string, Record<string, unknown>>();

export function cacheAuditReport(shareToken: string, row: Record<string, unknown>): void {
  cache.set(shareToken, row);
}

export function getCachedAuditReport(shareToken: string): Record<string, unknown> | null {
  return cache.get(shareToken) ?? null;
}
