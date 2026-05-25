const DEFAULT_WEBHOOK =
  "https://hook.us2.make.com/x63l7wdlcc3c21apisqk2h7ic35ccxs3";

export function getPhase1WebhookUrl(): string {
  return (process.env.MAKE_WEBHOOK_URL ?? DEFAULT_WEBHOOK).trim();
}

/** Fire-and-forget Phase 1 trigger — forwards URL to Make.com only. */
export async function handlePhase1AuditTrigger(websiteUrl: string): Promise<void> {
  const webhookUrl = getPhase1WebhookUrl();
  if (!websiteUrl.trim()) {
    throw new Error("website_url is required");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        website_url: websiteUrl,
        source: "blastly_phase_1",
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Make.com webhook failed (${res.status})`);
    }
  } finally {
    clearTimeout(timeout);
  }
}
