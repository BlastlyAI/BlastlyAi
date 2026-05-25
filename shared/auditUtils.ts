import type { WebsiteAuditData } from "./auditTypes";

export function scoreBand(score: number): "green" | "yellow" | "red" {
  if (score >= 90) return "green";
  if (score >= 60) return "yellow";
  return "red";
}

export function scoreBandLabel(score: number): string {
  if (score >= 90) return "Strong";
  if (score >= 60) return "Needs improvement";
  return "Critical gaps";
}

export function faviconUrlForHost(host: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;
}

export function hostnameFromWebsite(website: string): string {
  try {
    const url = website.startsWith("http") ? website : `https://${website}`;
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return website.replace(/^https?:\/\//, "").split("/")[0].replace(/^www\./, "");
  }
}

export function normalizeWebsiteUrl(website: string): string {
  const trimmed = website.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
}

export function businessNameFromTitle(title: string | null, host: string): string {
  if (title) {
    const part = title.split(/[|\-–—]/)[0]?.trim();
    if (part && part.length >= 2 && part.length <= 80) return part;
  }
  const slug = host.split(".")[0] || "business";
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function overallWebsiteScore(data: WebsiteAuditData): number {
  const s = data.sections;
  return Math.round(
    (s.branding.score + s.performance.score + s.content.score + s.seo.score + s.socialTrust.score) / 5
  );
}
