/** Evidence-backed website audit types (shared client + server). */

export type AuditCheckStatus = "pass" | "warn" | "fail" | "unknown";

export type BusinessType =
  | "ecommerce"
  | "saas"
  | "local_service"
  | "agency"
  | "media"
  | "nonprofit"
  | "corporate"
  | "unknown";

export type ExtractConfidence = "detected" | "inferred" | "unknown";

export type ExtractField<T> = {
  value: T | null;
  confidence: ExtractConfidence;
  evidence?: string;
};

export type CtaButton = {
  text: string;
  href: string | null;
};

export type WebsiteExtract = {
  url: string;
  finalUrl: string;
  fetchedAt: string;
  fetchStatus: number;
  businessName: ExtractField<string>;
  businessType: ExtractField<BusinessType>;
  pageTitle: ExtractField<string>;
  metaDescription: ExtractField<string>;
  metaTitle: ExtractField<string>;
  heroHeadline: ExtractField<string>;
  heroSubheadline: ExtractField<string>;
  navigation: ExtractField<string[]>;
  ctaButtons: ExtractField<CtaButton[]>;
  products: ExtractField<string[]>;
  services: ExtractField<string[]>;
  pricingDetected: ExtractField<boolean>;
  pricingUrls: ExtractField<string[]>;
  blogDetected: ExtractField<boolean>;
  blogUrls: ExtractField<string[]>;
  contact: {
    email: ExtractField<string>;
    phone: ExtractField<string>;
    address: ExtractField<string>;
  };
  socialLinks: ExtractField<Record<string, string>>;
  trustSignals: ExtractField<string[]>;
  schemaOrg: ExtractField<unknown[]>;
  headings: ExtractField<{ level: number; text: string }[]>;
  technologies: ExtractField<string[]>;
  logoUrl: ExtractField<string>;
  faviconUrl: ExtractField<string>;
  brandingColors: ExtractField<string[]>;
  technical: {
    https: boolean;
    sslValid: boolean;
    hasViewportMeta: boolean;
    canonicalUrl: ExtractField<string>;
    robotsMeta: ExtractField<string>;
    htmlLang: ExtractField<string>;
  };
};

export type AuditCheck = {
  id: string;
  label: string;
  status: AuditCheckStatus;
  detail: string;
  evidence?: string;
  weight: number;
};

export type AuditSection = {
  score: number;
  checks: AuditCheck[];
};

export type WebsiteAuditData = {
  faviconUrl: string;
  websiteUrl: string;
  pageTitle: string;
  metaTitle: string;
  heroHeadline: string | null;
  ctaButtons: string[];
  services: string[];
  products: string[];
  businessType: BusinessType;
  socialLinks: { platform: string; url: string | null; detected: boolean }[];
  brandingColors: string[];
  footerInfo: {
    email: string | null;
    phone: string | null;
    address: string | null;
  };
  technical: {
    https: boolean;
    sslValid: boolean;
    mobileFriendly: "likely" | "unclear" | "unlikely";
    pageSpeedEstimate: "Unknown" | "Fast" | "Moderate" | "Slow";
    blogDetected: boolean;
    imageOptimization: "good" | "needs-work" | "unknown";
  };
  sections: {
    branding: AuditSection;
    performance: AuditSection;
    content: AuditSection;
    seo: AuditSection;
    socialTrust: AuditSection;
  };
  aiInsights: string[];
  scoreSummary: string;
  dataConfidence: "scraped" | "partial" | "failed";
  scoringVersion: string;
  extract?: WebsiteExtract;
};

export const SCORING_VERSION = "2026.05.1";
