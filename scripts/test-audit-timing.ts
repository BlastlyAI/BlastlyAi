import "dotenv/config";
import { fetchHtml } from "../server/audit/fetchHtml.ts";
import { extractWebsite } from "../server/audit/extractor.ts";
import { runWebsiteAudit } from "../server/audit/runWebsiteAudit.ts";
import { isAuditLlmEnabled, isAuditMockMode } from "../server/audit/auditConfig.ts";

async function main() {
  const url = "https://www.freelancer.in";
  console.log("mock:", isAuditMockMode(), "llm:", isAuditLlmEnabled());

let t = Date.now();
try {
  const r = await fetchHtml(url);
  console.log("fetch ok", r.statusCode, r.html.length, Date.now() - t, "ms");
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  console.log("fetch err", msg, Date.now() - t, "ms");
}

  t = Date.now();
  const ex = await extractWebsite(url);
  console.log("extract", ex.fetchStatus, ex.businessName.value, Date.now() - t, "ms");

  t = Date.now();
  const audit = await runWebsiteAudit({ website: url, businessName: "freelancer.in" });
  console.log("audit", audit.overallScore, Date.now() - t, "ms");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
