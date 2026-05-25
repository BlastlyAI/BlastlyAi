import type { Express, Request, Response } from "express";
import {
  handleAuditAttach,
  handleAuditGetReport,
  handleAuditLatest,
  handleAuditList,
  handleAuditRun,
} from "./auditApiHandlers";
import { handlePhase1AuditTrigger } from "./phase1AuditTrigger";
import type { RunAuditInput } from "../audit/types";
import { readAuthorizationHeader, resolveAuditAuth } from "../lib/auditAuthRequest";

function readJsonBody(req: Request): unknown {
  if (req.body && typeof req.body === "object") return req.body;
  return {};
}

export function registerAuditApiRoutes(app: Express): void {
  app.post("/api/audit/trigger", async (req: Request, res: Response) => {
    try {
      const body = readJsonBody(req) as { website_url?: string };
      const websiteUrl = body.website_url?.trim();
      if (!websiteUrl) {
        res.status(400).json({ error: "website_url is required" });
        return;
      }
      await handlePhase1AuditTrigger(websiteUrl);
      res.json({ ok: true });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Trigger failed";
      console.error("[audit/trigger]", message);
      res.status(502).json({ error: message });
    }
  });

  app.post("/api/audit/run", async (req: Request, res: Response) => {
    try {
      const body = readJsonBody(req) as RunAuditInput;
      const auth = await resolveAuditAuth(readAuthorizationHeader(req.headers));
      const result = await handleAuditRun(body, auth);
      res.json(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Audit failed";
      console.error("[audit/run]", message);
      res.status(500).json({ success: false, error: message });
    }
  });

  app.post("/api/audit/attach", async (req: Request, res: Response) => {
    try {
      const body = readJsonBody(req) as { shareToken?: string; workspaceId?: string | null };
      const auth = await resolveAuditAuth(readAuthorizationHeader(req.headers));
      if (!auth.userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const result = await handleAuditAttach(body, auth);
      res.json(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Attach failed";
      const status = message === "Report not found" ? 404 : message.includes("Authentication") ? 401 : 500;
      res.status(status).json({ error: message });
    }
  });

  app.get("/api/audit/latest", async (req: Request, res: Response) => {
    try {
      const auth = await resolveAuditAuth(readAuthorizationHeader(req.headers));
      if (!auth.userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const workspaceId = String(req.query.workspaceId ?? "") || null;
      const result = await handleAuditLatest(workspaceId, auth);
      res.json(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Latest audit failed";
      res.status(500).json({ error: message });
    }
  });

  app.get("/api/audit/report/:shareToken", async (req: Request, res: Response) => {
    try {
      const result = await handleAuditGetReport(req.params.shareToken);
      res.json(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Not found";
      res.status(message === "Report not found" ? 404 : 500).json({ error: message });
    }
  });

  app.get("/api/audit/list", async (req: Request, res: Response) => {
    try {
      const auth = await resolveAuditAuth(readAuthorizationHeader(req.headers));
      if (!auth.userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const workspaceId = String(req.query.workspaceId ?? "") || undefined;
      const result = await handleAuditList(workspaceId, auth);
      res.json(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : "List failed";
      const status = message.includes("Authentication") ? 401 : 500;
      res.status(status).json({ error: message });
    }
  });
}
