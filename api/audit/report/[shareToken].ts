import { handleAuditGetReport } from "../../../server/routes/auditApiHandlers";

export default async function handler(
  req: { method?: string; query?: { shareToken?: string } },
  res: { status: (n: number) => { json: (b: unknown) => void } }
) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const shareToken = req.query?.shareToken;
  if (!shareToken) {
    res.status(400).json({ error: "shareToken required" });
    return;
  }
  try {
    const result = await handleAuditGetReport(shareToken);
    res.status(200).json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Not found";
    res.status(message === "Report not found" ? 404 : 500).json({ error: message });
  }
}
