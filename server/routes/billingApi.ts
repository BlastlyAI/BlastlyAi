import type { Express, Request, Response } from "express";
import {
  handleBillingConfirmSession,
  handleBillingCreateCheckout,
  handleBillingGetPlan,
  handleBillingSaveAssistant,
} from "./billingApiHandlers";
import { readAuthorizationHeader, resolveAuditAuth } from "../lib/auditAuthRequest";
import type { AssistantSetupInput } from "../billing/types";

function readJsonBody(req: Request): unknown {
  if (req.body && typeof req.body === "object") return req.body;
  return {};
}

export function registerBillingApiRoutes(app: Express): void {
  app.get("/api/billing/plan", async (req: Request, res: Response) => {
    try {
      const auth = await resolveAuditAuth(readAuthorizationHeader(req.headers));
      if (!auth.userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const result = await handleBillingGetPlan(auth);
      res.json(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load plan";
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/billing/assistant", async (req: Request, res: Response) => {
    try {
      const auth = await resolveAuditAuth(readAuthorizationHeader(req.headers));
      if (!auth.userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const body = readJsonBody(req) as AssistantSetupInput;
      const result = await handleBillingSaveAssistant(
        {
          assistantName: body.assistantName ?? "",
          assistantTone: body.assistantTone ?? "",
          assistantPersonality: body.assistantPersonality ?? "",
        },
        auth
      );
      res.json(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to save assistant";
      res.status(400).json({ error: message });
    }
  });

  app.post("/api/billing/checkout", async (req: Request, res: Response) => {
    try {
      const auth = await resolveAuditAuth(readAuthorizationHeader(req.headers));
      if (!auth.userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const body = readJsonBody(req) as { origin?: string };
      const result = await handleBillingCreateCheckout(body, auth);
      res.json(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Checkout failed";
      res.status(400).json({ error: message });
    }
  });

  app.get("/api/billing/confirm", async (req: Request, res: Response) => {
    try {
      const auth = await resolveAuditAuth(readAuthorizationHeader(req.headers));
      if (!auth.userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const sessionId = String(req.query.session_id ?? "");
      const result = await handleBillingConfirmSession(sessionId, auth);
      res.json(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Confirm failed";
      res.status(400).json({ error: message });
    }
  });
}
