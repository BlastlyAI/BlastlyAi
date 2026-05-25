import type { Express, Request, Response } from "express";
import { handleUserSync } from "./userApiHandlers";
import { readAuthorizationHeader, resolveAuditAuth } from "../lib/auditAuthRequest";

function readJsonBody(req: Request): unknown {
  if (req.body && typeof req.body === "object") return req.body;
  return {};
}

export function registerUserApiRoutes(app: Express): void {
  app.post("/api/users/sync", async (req: Request, res: Response) => {
    try {
      const auth = await resolveAuditAuth(readAuthorizationHeader(req.headers));
      if (!auth.userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const body = readJsonBody(req) as {
        email?: string;
        displayName?: string;
        businessName?: string;
        website?: string;
      };
      const result = await handleUserSync(auth, body);
      res.json(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Sync failed";
      res.status(500).json({ error: message });
    }
  });
}
