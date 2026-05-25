import { handlePhase1AuditTrigger } from "../../server/routes/phase1AuditTrigger";

export const config = { maxDuration: 30 };

type TriggerBody = { website_url?: string };

export default async function handler(
  req: { method?: string; body?: TriggerBody },
  res: { status: (n: number) => { json: (b: unknown) => void } }
) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const websiteUrl = req.body?.website_url?.trim();
  if (!websiteUrl) {
    res.status(400).json({ error: "website_url is required" });
    return;
  }

  try {
    await handlePhase1AuditTrigger(websiteUrl);
    res.status(200).json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Trigger failed";
    console.error("[api/audit/trigger]", message);
    res.status(502).json({ error: message });
  }
}
