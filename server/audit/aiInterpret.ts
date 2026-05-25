import { invokeLLM } from "../_core/llm";
import type { WebsiteExtract } from "../../shared/auditTypes";
import type { ScoredSections } from "../../shared/auditScoring";
import { buildRuleBasedInsights } from "./ruleBasedInsights";
import { AUDIT_LLM_MAX_TOKENS, AUDIT_LLM_TIMEOUT_MS, isAuditLlmEnabled } from "./auditConfig";

type AiInterpretResult = {
  summary: string;
  insights: string[];
};

/** Constrained AI interpretation — only references extracted JSON. */
export async function interpretWebsiteAudit(
  extract: WebsiteExtract,
  scored: ScoredSections
): Promise<AiInterpretResult> {
  const fallback = {
    summary: "",
    insights: buildRuleBasedInsights(extract, scored),
  };

  if (extract.fetchStatus === 0 || !isAuditLlmEnabled()) {
    return {
      summary: extract.fetchStatus === 0 ? `Unable to fetch ${extract.url} for analysis.` : "",
      insights: fallback.insights,
    };
  }

  const extractJson = JSON.stringify(
    {
      url: extract.url,
      businessName: extract.businessName,
      businessType: extract.businessType,
      pageTitle: extract.pageTitle,
      metaDescription: extract.metaDescription,
      heroHeadline: extract.heroHeadline,
      ctaButtons: extract.ctaButtons,
      products: extract.products,
      services: extract.services,
      contact: extract.contact,
      socialLinks: extract.socialLinks,
      blogDetected: extract.blogDetected,
      pricingDetected: extract.pricingDetected,
      trustSignals: extract.trustSignals,
      technologies: extract.technologies,
      navigation: extract.navigation,
      scores: {
        overall: scored.overallScore,
        branding: scored.branding.score,
        performance: scored.performance.score,
        content: scored.content.score,
        seo: scored.seo.score,
        socialTrust: scored.socialTrust.score,
      },
    },
    null,
    2
  );

  try {
    const res = (await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a website auditor. You ONLY analyze the provided extracted JSON. " +
            "NEVER invent services, products, emails, phone numbers, or social links. " +
            "If a field is null, say it was not detected. Return raw JSON only: " +
            '{ "summary": "2 sentences max", "insights": ["3-5 bullet observations"] }',
        },
        {
          role: "user",
          content: `Analyze this extracted website data:\n${extractJson}`,
        },
      ],
      maxTokens: AUDIT_LLM_MAX_TOKENS,
      timeoutMs: AUDIT_LLM_TIMEOUT_MS,
    })) as { choices: Array<{ message: { content: string } }> };

    let raw = res.choices[0]?.message?.content ?? "{}";
    if (typeof raw === "string") {
      raw = raw.trim().replace(/^```json?\s*/i, "").replace(/```$/, "").trim();
    }
    const parsed = JSON.parse(typeof raw === "string" ? raw : "{}") as AiInterpretResult;
    if (parsed.summary && Array.isArray(parsed.insights) && parsed.insights.length > 0) {
      return {
        summary: parsed.summary,
        insights: parsed.insights.slice(0, 6),
      };
    }
  } catch {
    /* fall through to rule-based */
  }

  return {
    summary: "",
    insights: fallback.insights,
  };
}
