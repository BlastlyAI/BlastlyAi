import { describe, expect, it } from "vitest";
import { extractFromHtml } from "./extractor";
import { scoreWebsiteExtract } from "../../shared/auditScoring";

const NIKE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>Nike. Just Do It. Nike.com</title>
  <meta name="description" content="Nike delivers innovative products and experiences. Shop shoes, apparel and gear.">
  <meta property="og:title" content="Nike. Just Do It.">
  <link rel="canonical" href="https://www.nike.com/">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" href="/favicon.ico">
  <script type="application/ld+json">{"@type":"ItemList","name":"Featured Products"}</script>
</head>
<body>
  <nav><a href="/shop">Shop</a><a href="/collections">Collections</a><a href="/products">Products</a></nav>
  <main>
    <h1>Just Do It</h1>
    <a href="/cart" class="btn">Add to Cart</a>
    <a href="/checkout">Checkout</a>
    <h2>Featured Products</h2>
    <h3>Air Max 90</h3>
    <h3>Air Force 1</h3>
  </main>
  <footer><a href="https://instagram.com/nike">Instagram</a></footer>
</body>
</html>`;

const STRIPE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>Stripe | Financial Infrastructure to Grow Your Revenue</title>
  <meta name="description" content="Stripe is a suite of APIs powering online payment processing and commerce solutions for internet businesses of all sizes.">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script type="application/ld+json">{"@type":"SoftwareApplication","name":"Stripe"}</script>
  <script src="https://js.stripe.com/v3/"></script>
</head>
<body>
  <nav><a href="/pricing">Pricing</a><a href="/docs">Developers</a><a href="/platform">Platform</a></nav>
  <main>
    <h1>Financial infrastructure for the internet</h1>
    <p>Millions of companies use Stripe to accept payments and grow their revenue.</p>
    <a href="/signup" class="btn">Start now</a>
    <a href="/pricing">Pricing</a>
  </main>
  <footer><a href="https://twitter.com/stripe">Twitter</a><a href="mailto:support@stripe.com">Email</a></footer>
</body>
</html>`;

const SHOPIFY_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>Shopify: The all-in-one commerce platform</title>
  <meta name="description" content="Try Shopify free and get all the tools you need to start, run, and grow your business. Sign up for a free trial today.">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://cdn.shopify.com/shopifycloud/"></script>
</head>
<body>
  <nav><a href="/pricing">Pricing</a><a href="/platform">Platform</a><a href="/developers">Developers</a></nav>
  <main>
    <h1>The platform commerce is built on</h1>
    <a href="/free-trial">Start free trial</a>
    <a href="/pricing">View pricing</a>
  </main>
</body>
</html>`;

const PLUMBER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>Joe's Plumbing | Licensed Plumber in Austin, TX</title>
  <meta name="description" content="Emergency plumbing services. Licensed and insured. Call now for same-day service in the Austin metro area.">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script type="application/ld+json">{"@type":"Plumber","name":"Joe's Plumbing"}</script>
</head>
<body>
  <header><img class="logo" src="/logo.png" alt="Joe's Plumbing logo"></header>
  <main>
    <h1>24/7 Emergency Plumbing in Austin</h1>
    <p>Licensed, insured plumbers serving the greater Austin service area.</p>
    <a href="tel:+15125550199" class="btn">Call Now</a>
    <a href="/quote">Get a Quote</a>
    <h2>Our Services</h2>
    <h3>Drain Cleaning</h3>
    <h3>Water Heater Repair</h3>
    <h3>Pipe Replacement</h3>
  </main>
  <footer>
    <a href="mailto:hello@joesplumbing.example">hello@joesplumbing.example</a>
    <a href="tel:+15125550199">(512) 555-0199</a>
  </footer>
</body>
</html>`;

function sectionScoreFromChecks(checks: { status: string; weight: number }[]): number {
  const total = checks.reduce((s, c) => s + c.weight, 0);
  const earned = checks.reduce((s, c) => {
    if (c.status === "pass") return s + c.weight;
    if (c.status === "warn") return s + c.weight * 0.5;
    return s;
  }, 0);
  return Math.round((earned / total) * 100);
}

describe("extractFromHtml business type detection", () => {
  it("detects ecommerce for Nike-like storefront HTML", () => {
    const extract = extractFromHtml(NIKE_HTML, "https://nike.com", "https://www.nike.com/", 200);
    expect(extract.businessType.value).toBe("ecommerce");
    expect(extract.heroHeadline.value).toBe("Just Do It");
    expect(extract.heroHeadline.evidence).toBe("h1");
    expect(extract.products.value?.length).toBeGreaterThan(0);
    expect(extract.contact.email.value).toBeNull();
    expect(extract.services.value ?? []).not.toContain("Consulting");
  });

  it("detects SaaS for Stripe-like platform HTML", () => {
    const extract = extractFromHtml(STRIPE_HTML, "https://stripe.com", "https://stripe.com/", 200);
    expect(extract.businessType.value).toBe("saas");
    expect(extract.pricingDetected.value).toBe(true);
    expect(extract.technologies.value).toContain("Stripe");
    expect(extract.contact.email.value).toBe("support@stripe.com");
    expect(extract.services.value ?? []).not.toContain("Consulting");
  });

  it("detects SaaS for Shopify platform HTML", () => {
    const extract = extractFromHtml(SHOPIFY_HTML, "https://shopify.com", "https://www.shopify.com/", 200);
    expect(["saas", "ecommerce"]).toContain(extract.businessType.value);
    expect(extract.technologies.value).toContain("Shopify");
    expect(extract.ctaButtons.value?.some((c) => /free trial|pricing/i.test(c.text))).toBe(true);
  });

  it("detects local_service for plumber HTML with real contact info", () => {
    const extract = extractFromHtml(
      PLUMBER_HTML,
      "https://joesplumbing.example",
      "https://joesplumbing.example/",
      200
    );
    expect(extract.businessType.value).toBe("local_service");
    expect(extract.businessName.value).toBe("Joe's Plumbing");
    expect(extract.contact.phone.value).toBeTruthy();
    expect(extract.contact.email.value).toBe("hello@joesplumbing.example");
    expect(extract.services.value?.length).toBeGreaterThan(0);
    expect(extract.services.value).toContain("Drain Cleaning");
  });

  it("does not infer agency/consulting without explicit content", () => {
    const extract = extractFromHtml(NIKE_HTML, "https://nike.com", "https://www.nike.com/", 200);
    expect(extract.businessType.value).not.toBe("agency");
    expect(extract.services.value ?? []).not.toContain("Consulting");
  });
});

describe("scoreWebsiteExtract deterministic scoring", () => {
  it("section scores match visible checklist math", () => {
    const extract = extractFromHtml(PLUMBER_HTML, "https://joesplumbing.example", "https://joesplumbing.example/", 200);
    const scored = scoreWebsiteExtract(extract);

    expect(scored.branding.score).toBe(sectionScoreFromChecks(scored.branding.checks));
    expect(scored.performance.score).toBe(sectionScoreFromChecks(scored.performance.checks));
    expect(scored.content.score).toBe(sectionScoreFromChecks(scored.content.checks));
    expect(scored.seo.score).toBe(sectionScoreFromChecks(scored.seo.checks));
    expect(scored.socialTrust.score).toBe(sectionScoreFromChecks(scored.socialTrust.checks));
  });

  it("does not produce random or seeded scores across runs", () => {
    const extract = extractFromHtml(STRIPE_HTML, "https://stripe.com", "https://stripe.com/", 200);
    const a = scoreWebsiteExtract(extract);
    const b = scoreWebsiteExtract(extract);
    expect(a).toEqual(b);
    expect(a.overallScore).toBeGreaterThan(0);
    expect(a.overallScore).toBeLessThanOrEqual(100);
  });
});
