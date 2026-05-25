import { describe, expect, it } from "vitest";
import { sanitizeAuditPersistPayload } from "./sanitizePayload";
import type { AuditPersistPayload } from "./persist";

const basePayload: AuditPersistPayload = {
  shareToken: "audit-testtoken12",
  workspaceId: "not-a-uuid",
  userId: null,
  createdBy: null,
  businessName: "Acme Co",
  industry: "Retail",
  website: "https://acme.example",
  handles: undefined as unknown as null,
  description: "Test",
  detectedHandles: {},
  geographicReach: null,
  adSpend: 99.7,
  overallScore: 72.4,
  platformScores: {},
  contentScore: 68,
  adQualityScore: 0,
  engagementScore: 0,
  growthScore: 0,
  cyberSecurityScore: 75,
  findings: [{ title: "Test" }],
  recommendations: [],
  blastlyPitch: null,
  rawReport: { source: "test" },
};

describe("sanitizeAuditPersistPayload", () => {
  it("rounds scores to integers and nulls invalid uuids", () => {
    const row = sanitizeAuditPersistPayload(basePayload, "Fallback Name");
    expect(row.overall_score).toBe(72);
    expect(row.ad_spend).toBe(100);
    expect(row.workspace_id).toBeNull();
    expect(row.detected_handles).toBeNull();
    expect(row.business_name).toBe("Acme Co");
  });

  it("uses fallback business name when empty", () => {
    const row = sanitizeAuditPersistPayload(
      { ...basePayload, businessName: "  " },
      "Fallback Name"
    );
    expect(row.business_name).toBe("Fallback Name");
  });
});
