import * as cheerio from "cheerio";
import type {
  BusinessType,
  CtaButton,
  ExtractConfidence,
  ExtractField,
  WebsiteExtract,
} from "../../shared/auditTypes";
import { normalizeWebsiteUrl } from "../../shared/auditUtils";
import { fetchHtml } from "./fetchHtml";

const SOCIAL_PATTERNS: Record<string, RegExp> = {
  facebook: /facebook\.com\/(?!sharer|share|dialog|login)/i,
  instagram: /instagram\.com\//i,
  linkedin: /linkedin\.com\/(company|in|school)\//i,
  twitter: /(twitter\.com|x\.com)\/(?!intent|share)/i,
  tiktok: /tiktok\.com\/@/i,
  youtube: /youtube\.com\/(channel|c|user|@)/i,
  pinterest: /pinterest\.(com|com\.au|co\.uk)\//i,
};

const CTA_PATTERN =
  /^(shop|buy|get started|start free|sign up|signup|register|contact|book|quote|learn more|subscribe|try|order|add to cart|view all|explore|download|demo|pricing|get a quote|call now|request)/i;

const TECH_SIGNATURES: Record<string, RegExp> = {
  Shopify: /cdn\.shopify\.com|Shopify\.theme/i,
  WooCommerce: /woocommerce|wp-content\/plugins\/woocommerce/i,
  WordPress: /wp-content|wp-includes/i,
  React: /react-dom|__NEXT_DATA__|_next\/static/i,
  "Next.js": /__NEXT_DATA__|_next\/static/i,
  Stripe: /js\.stripe\.com/i,
  "Google Analytics": /google-analytics\.com|gtag\(|googletagmanager/i,
  HubSpot: /js\.hs-scripts\.com|hubspot/i,
};

function field<T>(
  value: T | null,
  confidence: ExtractConfidence,
  evidence?: string
): ExtractField<T> {
  return { value, confidence, evidence };
}

function emptyField<T>(confidence: ExtractConfidence = "unknown"): ExtractField<T> {
  return { value: null, confidence };
}

function uniq(items: string[]): string[] {
  return Array.from(new Set(items.map((s) => s.trim()).filter(Boolean)));
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function absUrl(href: string | undefined, base: string): string | null {
  if (!href || href.startsWith("#") || href.startsWith("javascript:")) return null;
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

function extractEmails(html: string, $: cheerio.CheerioAPI): string[] {
  const emails = new Set<string>();
  $('a[href^="mailto:"]').each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const email = href.replace(/^mailto:/i, "").split("?")[0].trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) emails.add(email);
  });
  const matches = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) ?? [];
  for (const m of matches) {
    if (!m.includes("example.com") && !m.includes("wixpress")) emails.add(m);
  }
  return Array.from(emails).slice(0, 3);
}

function extractPhones(html: string, $: cheerio.CheerioAPI): string[] {
  const phones = new Set<string>();
  $('a[href^="tel:"]').each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const phone = href.replace(/^tel:/i, "").trim();
    if (phone.length >= 8) phones.add(phone);
  });
  const matches =
    html.match(/(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}/g) ?? [];
  for (const m of matches) {
    const digits = m.replace(/\D/g, "");
    if (digits.length >= 10 && digits.length <= 15) phones.add(m.trim());
  }
  return Array.from(phones).slice(0, 3);
}

function extractSocialLinks($: cheerio.CheerioAPI, base: string): Record<string, string> {
  const found: Record<string, string> = {};
  $("a[href]").each((_, el) => {
    const href = absUrl($(el).attr("href"), base);
    if (!href) return;
    for (const [platform, pattern] of Object.entries(SOCIAL_PATTERNS)) {
      if (pattern.test(href) && !found[platform]) {
        found[platform] = href.split("?")[0].replace(/\/+$/, "");
      }
    }
  });
  return found;
}

function extractHeadings($: cheerio.CheerioAPI): { level: number; text: string }[] {
  const headings: { level: number; text: string }[] = [];
  $("h1, h2, h3, h4, h5, h6").each((_, el) => {
    const tag = (el as { tagName?: string }).tagName?.toLowerCase() ?? "";
    const level = parseInt(tag.replace("h", ""), 10);
    const text = cleanText($(el).text());
    if (text && text.length <= 200) headings.push({ level, text });
  });
  return headings.slice(0, 40);
}

function extractCtas($: cheerio.CheerioAPI, base: string): CtaButton[] {
  const ctas: CtaButton[] = [];
  const seen = new Set<string>();
  $("a, button, [role=button], input[type=submit]").each((_, el) => {
    const text = cleanText($(el).text() || $(el).attr("value") || $(el).attr("aria-label") || "");
    if (!text || text.length > 60 || text.length < 2) return;
    if (!CTA_PATTERN.test(text) && !$(el).is("button, input[type=submit]")) return;
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    const href = $(el).is("a") ? absUrl($(el).attr("href"), base) : null;
    ctas.push({ text, href });
  });
  return ctas.slice(0, 12);
}

function extractNav($: cheerio.CheerioAPI): string[] {
  const items: string[] = [];
  $("nav a, header a, [role=navigation] a").each((_, el) => {
    const text = cleanText($(el).text());
    if (text && text.length <= 40 && text.length >= 2) items.push(text);
  });
  return uniq(items).slice(0, 20);
}

function extractSchemaOrg($: cheerio.CheerioAPI): unknown[] {
  const blocks: unknown[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $(el).html()?.trim();
      if (raw) blocks.push(JSON.parse(raw));
    } catch {
      /* skip invalid json-ld */
    }
  });
  return blocks;
}

function schemaTypes(blocks: unknown[]): string[] {
  const types: string[] = [];
  for (const block of blocks) {
    const walk = (obj: unknown) => {
      if (!obj || typeof obj !== "object") return;
      const o = obj as Record<string, unknown>;
      if (typeof o["@type"] === "string") types.push(o["@type"]);
      if (Array.isArray(o["@type"])) types.push(...(o["@type"] as string[]));
      if (o["@graph"]) (o["@graph"] as unknown[]).forEach(walk);
    };
    walk(block);
  }
  return types.map((t) => t.toLowerCase());
}

function extractProductsAndServices(
  $: cheerio.CheerioAPI,
  schemaBlocks: unknown[]
): { products: string[]; services: string[] } {
  const products: string[] = [];
  const services: string[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = JSON.parse($(el).html() ?? "{}");
      const walk = (obj: unknown) => {
        if (!obj || typeof obj !== "object") return;
        const o = obj as Record<string, unknown>;
        const type = String(o["@type"] ?? "").toLowerCase();
        if (type === "product" && typeof o.name === "string") products.push(o.name);
        if (type === "service" && typeof o.name === "string") services.push(o.name);
        if (o["@graph"]) (o["@graph"] as unknown[]).forEach(walk);
        if (Array.isArray(obj)) (obj as unknown[]).forEach(walk);
      };
      walk(raw);
    } catch {
      /* skip */
    }
  });

  $("h2, h3").each((_, el) => {
    const text = cleanText($(el).text());
    const parentText = $(el).parent().text().toLowerCase();
    if (/service|what we do|our work|solutions|offerings/i.test(parentText) && text.length <= 80) {
      services.push(text);
    }
    if (/product|shop|collection|featured/i.test(parentText) && text.length <= 80) {
      products.push(text);
    }
  });

  return { products: uniq(products).slice(0, 12), services: uniq(services).slice(0, 12) };
}

function detectBusinessType(
  $: cheerio.CheerioAPI,
  html: string,
  schemaBlocks: unknown[],
  nav: string[],
  products: string[],
  host: string
): BusinessType {
  const htmlLower = html.toLowerCase();
  const types = schemaTypes(schemaBlocks);
  const navText = nav.join(" ").toLowerCase();

  if (
    types.some((t) => t.includes("product") || t.includes("store") || t.includes("itemlist")) ||
    /add to cart|shopping cart|checkout|\/cart|shopify|woocommerce/i.test(htmlLower) ||
    products.length >= 2 ||
    /shop|store|collections|products/i.test(navText)
  ) {
    return "ecommerce";
  }

  if (
    types.some((t) => t.includes("softwareapplication") || t.includes("webapplication")) ||
    /free trial|sign up|get started|pricing|api docs|developer docs|saas|platform/i.test(htmlLower) ||
    /pricing|developers|docs|platform|api/i.test(navText)
  ) {
    return "saas";
  }

  if (
    types.some((t) => t.includes("localbusiness") || t.includes("plumber") || t.includes("homeandconstructionbusiness")) ||
    /service area|call now|emergency|licensed|insured|plumbing|electrician|hvac/i.test(htmlLower)
  ) {
    return "local_service";
  }

  if (/\bagency\b|marketing agency|creative agency|digital agency/i.test(htmlLower)) {
    return "agency";
  }

  if (types.some((t) => t.includes("nonprofit"))) {
    return "nonprofit";
  }

  if (/blog|news|article|magazine/i.test(navText)) {
    return "media";
  }

  if (types.some((t) => t.includes("organization") || t.includes("corporation"))) {
    return "corporate";
  }

  return "unknown";
}

function extractTrustSignals($: cheerio.CheerioAPI, html: string): string[] {
  const signals: string[] = [];
  const htmlLower = html.toLowerCase();
  if (/testimonial|what our customers say|client reviews/i.test(htmlLower)) signals.push("Testimonials section");
  if (/trustpilot|google reviews|star rating|★|verified/i.test(htmlLower)) signals.push("Review/rating indicators");
  if (/ssl|secure checkout|money-back|guarantee|certified|accredited/i.test(htmlLower)) signals.push("Trust badges");
  if ($('[itemtype*="Review"]').length > 0) signals.push("Schema.org reviews");
  return uniq(signals);
}

function detectBlog($: cheerio.CheerioAPI, base: string): { detected: boolean; urls: string[] } {
  const urls: string[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (/\/(blog|news|articles|insights|resources)(\/|$)/i.test(href)) {
      const abs = absUrl(href, base);
      if (abs) urls.push(abs);
    }
  });
  return { detected: urls.length > 0, urls: uniq(urls).slice(0, 5) };
}

function detectPricing($: cheerio.CheerioAPI, base: string): { detected: boolean; urls: string[] } {
  const urls: string[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const text = cleanText($(el).text()).toLowerCase();
    if (/\/(pricing|plans|prices)(\/|$)/i.test(href) || text === "pricing" || text === "plans") {
      const abs = absUrl(href, base);
      if (abs) urls.push(abs);
    }
  });
  return { detected: urls.length > 0, urls: uniq(urls).slice(0, 5) };
}

function extractTechnologies(html: string): string[] {
  const found: string[] = [];
  for (const [name, pattern] of Object.entries(TECH_SIGNATURES)) {
    if (pattern.test(html)) found.push(name);
  }
  return found;
}

function extractLogo($: cheerio.CheerioAPI, base: string): string | null {
  const candidates = [
    $('meta[property="og:logo"]').attr("content"),
    $('img[class*="logo" i]').first().attr("src"),
    $('img[alt*="logo" i]').first().attr("src"),
    $("header img").first().attr("src"),
  ];
  for (const c of candidates) {
    const abs = absUrl(c, base);
    if (abs) return abs;
  }
  return null;
}

function extractFavicon($: cheerio.CheerioAPI, base: string): string | null {
  const href =
    $('link[rel="icon"]').attr("href") ??
    $('link[rel="shortcut icon"]').attr("href") ??
    $('link[rel="apple-touch-icon"]').attr("href");
  return absUrl(href, base);
}

function extractHero($: cheerio.CheerioAPI): { headline: string | null; sub: string | null; evidence: string } {
  const h1 = $("h1").first();
  const headline = cleanText(h1.text()) || null;
  if (headline) {
    const sub = cleanText(h1.next("p").text()) || cleanText($("h1").first().parent().find("p").first().text()) || null;
    return { headline, sub: sub && sub.length <= 200 ? sub : null, evidence: "h1" };
  }
  const hero = $('[class*="hero" i] h2, main h2, [role="banner"] h2').first();
  const h2Text = cleanText(hero.text());
  if (h2Text) return { headline: h2Text, sub: null, evidence: "h2.hero" };
  return { headline: null, sub: null, evidence: "" };
}

function inferBusinessName(pageTitle: string | null, schemaBlocks: unknown[], host: string): string | null {
  for (const block of schemaBlocks) {
    const walk = (obj: unknown): string | null => {
      if (!obj || typeof obj !== "object") return null;
      const o = obj as Record<string, unknown>;
      if (typeof o.name === "string" && o.name.length >= 2) return o.name;
      if (o["@graph"]) {
        for (const g of o["@graph"] as unknown[]) {
          const n = walk(g);
          if (n) return n;
        }
      }
      return null;
    };
    const name = walk(block);
    if (name) return name;
  }
  if (pageTitle) {
    const part = pageTitle.split(/[|\-–—]/)[0]?.trim();
    if (part && part.length >= 2) return part;
  }
  const slug = host.split(".")[0];
  if (slug && slug !== "www") {
    return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return null;
}

/** Parse HTML into evidence-backed WebsiteExtract. */
export function extractFromHtml(
  html: string,
  url: string,
  finalUrl: string,
  statusCode: number
): WebsiteExtract {
  const $ = cheerio.load(html);
  const base = finalUrl || url;
  const host = new URL(base).hostname.replace(/^www\./, "");

  const pageTitle = cleanText($("title").first().text()) || null;
  const metaDescription =
    $('meta[name="description"]').attr("content")?.trim() ||
    $('meta[property="og:description"]').attr("content")?.trim() ||
    null;
  const ogTitle = $('meta[property="og:title"]').attr("content")?.trim() || null;
  const metaTitle = ogTitle || pageTitle;

  const schemaBlocks = extractSchemaOrg($);
  const nav = extractNav($);
  const { products, services } = extractProductsAndServices($, schemaBlocks);
  const hero = extractHero($);
  const ctas = extractCtas($, base);
  const social = extractSocialLinks($, base);
  const emails = extractEmails(html, $);
  const phones = extractPhones(html, $);
  const blog = detectBlog($, base);
  const pricing = detectPricing($, base);
  const trust = extractTrustSignals($, html);
  const technologies = extractTechnologies(html);
  const logo = extractLogo($, base);
  const favicon = extractFavicon($, base);
  const headings = extractHeadings($);
  const businessType = detectBusinessType($, html, schemaBlocks, nav, products, host);
  const businessName = inferBusinessName(pageTitle, schemaBlocks, host);

  const canonical = $('link[rel="canonical"]').attr("href");
  const robots = $('meta[name="robots"]').attr("content");
  const htmlLang = $("html").attr("lang");
  const https = base.startsWith("https://");

  return {
    url,
    finalUrl: base,
    fetchedAt: new Date().toISOString(),
    fetchStatus: statusCode,
    businessName: field(businessName, businessName ? "detected" : "unknown", schemaBlocks.length ? "schema.org" : "title"),
    businessType: field(businessType, businessType !== "unknown" ? "detected" : "unknown", "content-signals"),
    pageTitle: field(pageTitle, pageTitle ? "detected" : "unknown", "title"),
    metaDescription: field(metaDescription, metaDescription ? "detected" : "unknown", 'meta[name="description"]'),
    metaTitle: field(metaTitle, metaTitle ? "detected" : "unknown", ogTitle ? 'meta[property="og:title"]' : "title"),
    heroHeadline: field(hero.headline, hero.headline ? "detected" : "unknown", hero.evidence || undefined),
    heroSubheadline: field(hero.sub, hero.sub ? "detected" : "unknown", "h1+p"),
    navigation: field(nav, nav.length ? "detected" : "unknown", "nav a"),
    ctaButtons: field(ctas, ctas.length ? "detected" : "unknown", "a,button"),
    products: field(products, products.length ? "detected" : "unknown", "schema.org/h2"),
    services: field(services, services.length ? "detected" : "unknown", "schema.org/h2"),
    pricingDetected: field(pricing.detected, pricing.detected ? "detected" : "unknown", "a[href*=pricing]"),
    pricingUrls: field(pricing.urls, pricing.urls.length ? "detected" : "unknown"),
    blogDetected: field(blog.detected, blog.detected ? "detected" : "unknown", "a[href*=blog]"),
    blogUrls: field(blog.urls, blog.urls.length ? "detected" : "unknown"),
    contact: {
      email: field(emails[0] ?? null, emails[0] ? "detected" : "unknown", 'a[href^="mailto:"]'),
      phone: field(phones[0] ?? null, phones[0] ? "detected" : "unknown", 'a[href^="tel:"]'),
      address: emptyField<string>(),
    },
    socialLinks: field(
      Object.keys(social).length ? social : null,
      Object.keys(social).length ? "detected" : "unknown",
      "a[href]"
    ),
    trustSignals: field(trust, trust.length ? "detected" : "unknown"),
    schemaOrg: field(schemaBlocks.length ? schemaBlocks : null, schemaBlocks.length ? "detected" : "unknown", "application/ld+json"),
    headings: field(headings, headings.length ? "detected" : "unknown", "h1-h6"),
    technologies: field(technologies, technologies.length ? "detected" : "unknown", "script signatures"),
    logoUrl: field(logo, logo ? "detected" : "unknown", "img.logo"),
    faviconUrl: field(favicon, favicon ? "detected" : "unknown", 'link[rel="icon"]'),
    brandingColors: emptyField<string[]>(),
    technical: {
      https,
      sslValid: https,
      hasViewportMeta: $('meta[name="viewport"]').length > 0,
      canonicalUrl: field(absUrl(canonical, base), canonical ? "detected" : "unknown", 'link[rel="canonical"]'),
      robotsMeta: field(robots ?? null, robots ? "detected" : "unknown", 'meta[name="robots"]'),
      htmlLang: field(htmlLang ?? null, htmlLang ? "detected" : "unknown", "html[lang]"),
    },
  };
}

/** Fetch URL and extract structured website intelligence. */
export async function extractWebsite(url: string): Promise<WebsiteExtract> {
  const normalized = normalizeWebsiteUrl(url);
  try {
    const { html, finalUrl, statusCode } = await fetchHtml(normalized);
    return extractFromHtml(html, normalized, finalUrl, statusCode);
  } catch {
    return {
      url: normalized,
      finalUrl: normalized,
      fetchedAt: new Date().toISOString(),
      fetchStatus: 0,
      businessName: emptyField<string>(),
      businessType: field<BusinessType>("unknown", "unknown"),
      pageTitle: emptyField<string>(),
      metaDescription: emptyField<string>(),
      metaTitle: emptyField<string>(),
      heroHeadline: emptyField<string>(),
      heroSubheadline: emptyField<string>(),
      navigation: emptyField<string[]>(),
      ctaButtons: emptyField<CtaButton[]>(),
      products: emptyField<string[]>(),
      services: emptyField<string[]>(),
      pricingDetected: emptyField<boolean>(),
      pricingUrls: emptyField<string[]>(),
      blogDetected: field(false, "unknown"),
      blogUrls: emptyField<string[]>(),
      contact: {
        email: emptyField<string>(),
        phone: emptyField<string>(),
        address: emptyField<string>(),
      },
      socialLinks: emptyField<Record<string, string>>(),
      trustSignals: emptyField<string[]>(),
      schemaOrg: emptyField<unknown[]>(),
      headings: emptyField<{ level: number; text: string }[]>(),
      technologies: emptyField<string[]>(),
      logoUrl: emptyField<string>(),
      faviconUrl: emptyField<string>(),
      brandingColors: emptyField<string[]>(),
      technical: {
        https: normalized.startsWith("https://"),
        sslValid: normalized.startsWith("https://"),
        hasViewportMeta: false,
        canonicalUrl: emptyField<string>(),
        robotsMeta: emptyField<string>(),
        htmlLang: emptyField<string>(),
      },
    };
  }
}
