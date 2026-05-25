import type { Express, Request, Response } from "express";
import { readAuthorizationHeader, resolveAuditAuth } from "../lib/auditAuthRequest";
import { handleWorkspaceEnsureDefault, handleWorkspaceList, handleWorkspaceCreate, handleWorkspaceUpdateBrandProfile } from "./workspaceApiHandlers";

function readJsonBody(req: Request): unknown {
  if (req.body && typeof req.body === "object") return req.body;
  return {};
}

export function registerWorkspaceApiRoutes(app: Express): void {
  app.get("/api/workspaces", async (req: Request, res: Response) => {
    try {
      const auth = await resolveAuditAuth(readAuthorizationHeader(req.headers));
      if (!auth.userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const result = await handleWorkspaceList(auth);
      res.json({ workspaces: result });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to list workspaces";
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/workspaces/ensure-default", async (req: Request, res: Response) => {
    try {
      const auth = await resolveAuditAuth(readAuthorizationHeader(req.headers));
      if (!auth.userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const body = readJsonBody(req) as { businessName?: string; website?: string };
      const workspace = await handleWorkspaceEnsureDefault(auth, body);
      res.json({ workspace });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to ensure workspace";
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/workspaces", async (req: Request, res: Response) => {
    try {
      const auth = await resolveAuditAuth(readAuthorizationHeader(req.headers));
      if (!auth.userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const body = readJsonBody(req) as { name?: string; website?: string; industry?: string; description?: string };
      const workspace = await handleWorkspaceCreate(auth, {
        name: body.name ?? "",
        website: body.website,
        industry: body.industry,
        description: body.description,
      });
      res.json({ workspace });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to create workspace";
      res.status(500).json({ error: message });
    }
  });

  app.patch("/api/workspaces/:workspaceId/brand-profile", async (req: Request, res: Response) => {
    try {
      const auth = await resolveAuditAuth(readAuthorizationHeader(req.headers));
      if (!auth.userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const workspaceId = String(req.params.workspaceId ?? "");
      const body = readJsonBody(req) as Record<string, unknown>;
      const workspace = await handleWorkspaceUpdateBrandProfile(auth, workspaceId, body as Parameters<typeof handleWorkspaceUpdateBrandProfile>[2]);
      res.json({ workspace });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to save brand profile";
      const status = /not found|forbidden/i.test(message) ? 404 : 500;
      res.status(status).json({ error: message });
    }
  });
}
