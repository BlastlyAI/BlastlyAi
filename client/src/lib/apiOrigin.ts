/**
 * When the UI is on Vercel but the Express API is on another host, set
 * `VITE_API_ORIGIN` (e.g. https://api.yourdomain.com) — no trailing slash.
 * Leave unset for same-origin (local dev or single-host deploy).
 */
export function getApiOrigin(): string {
  const raw = import.meta.env.VITE_API_ORIGIN as string | undefined;
  if (!raw?.trim()) return "";
  return raw.trim().replace(/\/$/, "");
}

/** Absolute or same-origin path for API routes (e.g. `/api/trpc`). */
export function apiUrl(path: string): string {
  const origin = getApiOrigin();
  const p = path.startsWith("/") ? path : `/${path}`;
  return origin ? `${origin}${p}` : p;
}

/** Public base URL for webhooks / OAuth callbacks (browser + server must agree). */
export function getPublicApiBaseUrl(): string {
  return getApiOrigin() || (typeof window !== "undefined" ? window.location.origin : "");
}
