/**
 * App Health Monitor
 * 
 * This module provides:
 * 1. A scheduled-task-compatible POST endpoint at /api/scheduled/health-check
 *    that the Manus scheduled task calls every 5 minutes. It checks all active
 *    connected apps, stores results, and notifies the owner on failures.
 * 
 * 2. DB helpers used by the tRPC workspace router to expose health data to the UI.
 */

import { Request, Response } from "express";
import { getDb } from "./db";
import { connectedApps, appHealthChecks } from "../drizzle/schema";
import { eq, desc, and, gte, lt } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";

const SLOW_THRESHOLD_MS = 3000; // >3s = "slow"
const DOWN_THRESHOLD_MS = 8000; // timeout after 8s = "down"

// Known health URLs for each app slug — the scheduled task checks these
const KNOWN_HEALTH_URLS: Record<string, string> = {
  "genius-jungle":  "https://aiquestacad-haf2tssz.manus.space",
  "coach-nova":     "https://fitcoachai-3xrr2fq9.manus.space",
  "blastly":        "https://www.blastly.ai",
};

async function checkUrl(url: string): Promise<{ status: "up" | "slow" | "down"; responseTimeMs: number | null; statusCode: number | null; errorMessage: string | null }> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DOWN_THRESHOLD_MS);
    const res = await fetch(url, { method: "GET", signal: controller.signal });
    clearTimeout(timeout);
    const elapsed = Date.now() - start;
    if (res.ok || res.status < 500) {
      return {
        status: elapsed > SLOW_THRESHOLD_MS ? "slow" : "up",
        responseTimeMs: elapsed,
        statusCode: res.status,
        errorMessage: null,
      };
    }
    return { status: "down", responseTimeMs: elapsed, statusCode: res.status, errorMessage: `HTTP ${res.status}` };
  } catch (err: unknown) {
    const elapsed = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);
    return { status: "down", responseTimeMs: elapsed, statusCode: null, errorMessage: msg };
  }
}

/**
 * POST /api/scheduled/health-check
 * Called by the Manus scheduled task every 5 minutes.
 * Accepts role "user" (scheduled task cookie) — no admin required.
 */
export async function handleHealthCheck(req: Request, res: Response) {
  try {
    // Get all active connected apps
    const db = await getDb();
    if (!db) return res.status(503).json({ ok: false, error: "Database unavailable" });
    const apps = await db.select().from(connectedApps).where(eq(connectedApps.isActive, true));

    const results: Array<{ appName: string; status: string; responseTimeMs: number | null }> = [];
    const failures: string[] = [];

    for (const app of apps) {
      const healthUrl = KNOWN_HEALTH_URLS[app.appSlug] ?? null;
      if (!healthUrl) {
        // No URL to check — skip
        continue;
      }

      const check = await checkUrl(healthUrl);

      // Store result
      await db!.insert(appHealthChecks).values({
        connectedAppId: app.id,
        workspaceId: app.workspaceId,
        status: check.status,
        responseTimeMs: check.responseTimeMs,
        statusCode: check.statusCode,
        errorMessage: check.errorMessage,
      });

      // Update lastEventAt on connected app if down/slow for visibility
      if (check.status === "down") {
        failures.push(`${app.appName} is DOWN — ${check.errorMessage ?? "no response"}`);
      }

      results.push({ appName: app.appName, status: check.status, responseTimeMs: check.responseTimeMs });
    }

    // Notify owner if any app is down
    if (failures.length > 0) {
      await notifyOwner({
        title: `⚠️ App Health Alert — ${failures.length} app(s) down`,
        content: failures.join("\n") + "\n\nCheck the App Health dashboard in Blastly for details.",
      });
    }

    // Clean up checks older than 7 days to keep the table lean
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await db!.delete(appHealthChecks).where(lt(appHealthChecks.checkedAt, sevenDaysAgo));

    return res.json({ ok: true, checked: results.length, failures: failures.length, results });
  } catch (err: unknown) {
    console.error("[HealthMonitor] Error:", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
}

/**
 * DB helpers for the tRPC workspace router
 */
export async function getLatestHealthChecks(workspaceId: number) {
  const db = await getDb();
  if (!db) return [];
  // Get the latest check for each connected app
  const apps = await db.select().from(connectedApps)
    .where(and(eq(connectedApps.workspaceId, workspaceId), eq(connectedApps.isActive, true)));

  const result = [];
  for (const app of apps) {
    const [latest] = await db!.select().from(appHealthChecks)
      .where(eq(appHealthChecks.connectedAppId, app.id))
      .orderBy(desc(appHealthChecks.checkedAt))
      .limit(1);

    // Last 24h uptime %
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentChecks = await db!.select().from(appHealthChecks)
      .where(and(
        eq(appHealthChecks.connectedAppId, app.id),
        gte(appHealthChecks.checkedAt, oneDayAgo)
      ));

    const upCount = recentChecks.filter((c: { status: string }) => c.status === "up" || c.status === "slow").length;
    const uptimePct = recentChecks.length > 0 ? Math.round((upCount / recentChecks.length) * 100) : null;

    result.push({
      app,
      latestCheck: latest ?? null,
      uptimePct24h: uptimePct,
      healthUrl: KNOWN_HEALTH_URLS[app.appSlug] ?? null,
    });
  }
  return result;
}

export async function getHealthHistory(connectedAppId: number, limitHours = 24) {
  const db = await getDb();
  if (!db) return [];
  const since = new Date(Date.now() - limitHours * 60 * 60 * 1000);
  return db.select().from(appHealthChecks)
    .where(and(
      eq(appHealthChecks.connectedAppId, connectedAppId),
      gte(appHealthChecks.checkedAt, since)
    ))
    .orderBy(desc(appHealthChecks.checkedAt))
    .limit(200);
}
