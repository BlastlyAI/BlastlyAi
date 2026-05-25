/** Persist onboarding progress so checkout/demo does not restart step 1. */
const DRAFT_KEY = "blastly_onboarding_draft";

export type OnboardingDraft = {
  step: number;
  workspaceId: number | null;
  businessName: string;
  website: string;
  industry: string;
  selectedIndustries: string[];
  description: string;
  contactEmail: string;
  contactMobile: string;
  phone: string;
  selectedPlatforms: string[];
  auditToken: string;
  services?: string[];
  brandTone?: string;
};

export function saveOnboardingDraft(draft: OnboardingDraft): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function loadOnboardingDraft(): OnboardingDraft | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OnboardingDraft;
  } catch {
    return null;
  }
}

export function clearOnboardingDraft(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(DRAFT_KEY);
}
