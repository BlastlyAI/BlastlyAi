const PLATFORM_ALIASES: Record<string, string> = {
  google_business: "gmb",
  google: "gmb",
  gmb: "gmb",
  twitter_x: "twitter",
  x: "twitter",
  twitter: "twitter",
  fb: "facebook",
  facebook: "facebook",
  instagram: "instagram",
  ig: "instagram",
  linkedin: "linkedin",
  youtube: "youtube",
  tiktok: "tiktok",
  pinterest: "pinterest",
  reddit: "reddit",
  bluesky: "bluesky",
  threads: "threads",
  snapchat: "snapchat",
  telegram: "telegram",
  website: "website",
};

export function normalizePlatformId(id: string): string {
  const key = id.trim().toLowerCase().replace(/\s+/g, "_");
  return PLATFORM_ALIASES[key] ?? key;
}

export function normalizePlatformIds(ids: string[] | null | undefined): string[] {
  if (!ids?.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    const norm = normalizePlatformId(id);
    if (norm && !seen.has(norm)) {
      seen.add(norm);
      out.push(norm);
    }
  }
  return out;
}
