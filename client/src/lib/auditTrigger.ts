import { apiUrl } from "@/lib/apiOrigin";

export function normalizeWebsiteUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
}

/** POST website URL to our API → Make.com Phase 1 webhook. */
export async function triggerPhase1Audit(websiteUrl: string): Promise<void> {
  const res = await fetch(apiUrl("/api/audit/trigger"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ website_url: websiteUrl }),
  });

  if (!res.ok) {
    let detail = "";
    try {
      const data = (await res.json()) as { error?: string };
      detail = data.error ?? "";
    } catch {
      /* ignore */
    }
    throw new Error(detail || `Audit trigger failed (${res.status})`);
  }
}

export const PHASE1_LOADING_MESSAGES = [
  "Reading your homepage…",
  "Detecting business name & branding…",
  "Finding services & contact details…",
  "Checking SEO & performance signals…",
  "Building your personalized report…",
] as const;
