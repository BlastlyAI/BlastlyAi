import { invokeLLM } from "../_core/llm";
import type { WebsiteExtract } from "../../shared/auditTypes";
import { AUDIT_LLM_MAX_TOKENS, AUDIT_LLM_TIMEOUT_MS, isAuditLlmEnabled } from "./auditConfig";

export type SuggestedPostDraft = {
  platform: string;
  title: string;
  caption: string;
};

function ruleBasedPosts(
  businessName: string,
  extract: WebsiteExtract
): SuggestedPostDraft[] {
  const services = extract.services.value ?? [];
  const products = extract.products.value ?? [];
  const hint = services[0] ?? products[0] ?? extract.businessType.value ?? "business";
  const platforms = Object.keys(extract.socialLinks.value ?? {});
  const p1 = platforms[0] ? capitalize(platforms[0]) : "Instagram";
  const p2 = platforms[1] ? capitalize(platforms[1]) : "Facebook";
  const p3 = platforms[2] ? capitalize(platforms[2]) : "LinkedIn";

  return [
    {
      platform: p1,
      title: "Brand introduction",
      caption: `${businessName} — ${hint}. Share what makes your offering unique, based on your website messaging.`,
    },
    {
      platform: p2,
      title: "Value spotlight",
      caption: `Help customers understand why ${businessName} is the right choice for ${hint.toLowerCase()}.`,
    },
    {
      platform: p3,
      title: "Expert tip",
      caption: `Share one practical insight related to ${hint.toLowerCase()} — aligned with your site's content.`,
    },
  ];
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Generate 3 starter social posts from extracted website data only. */
export async function generateSuggestedPosts(
  extract: WebsiteExtract,
  businessName: string
): Promise<SuggestedPostDraft[]> {
  const fallback = ruleBasedPosts(businessName, extract);

  if (extract.fetchStatus === 0 || !isAuditLlmEnabled()) return fallback;

  const extractJson = JSON.stringify(
    {
      businessName: extract.businessName,
      businessType: extract.businessType,
      heroHeadline: extract.heroHeadline,
      services: extract.services,
      products: extract.products,
      ctaButtons: extract.ctaButtons,
      socialLinks: extract.socialLinks,
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
            "You write social media post drafts. ONLY use facts from the provided extracted JSON. " +
            "NEVER invent services, products, offers, or contact details. " +
            'Return raw JSON: { "posts": [{ "platform": "Instagram|Facebook|LinkedIn", "title": "short headline", "caption": "2-3 sentences" }] } — exactly 3 posts.',
        },
        {
          role: "user",
          content: `Business: ${businessName}\nExtracted data:\n${extractJson}`,
        },
      ],
      maxTokens: AUDIT_LLM_MAX_TOKENS,
      timeoutMs: AUDIT_LLM_TIMEOUT_MS,
    })) as { choices: Array<{ message: { content: string } }> };

    let raw = res.choices[0]?.message?.content ?? "{}";
    raw = raw.trim().replace(/^```json?\s*/i, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(raw) as { posts?: SuggestedPostDraft[] };
    if (parsed.posts?.length) {
      return parsed.posts.slice(0, 3).map((p) => ({
        platform: p.platform || "Instagram",
        title: p.title || "Suggested post",
        caption: p.caption || "",
      }));
    }
  } catch {
    /* rule-based fallback */
  }

  return fallback;
}
