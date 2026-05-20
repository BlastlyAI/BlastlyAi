/**
 * Trial Reminder Cron Job
 *
 * Runs daily at 9 AM UTC. Finds workspaces whose trial ends in exactly 4 days
 * (i.e. day 10 of a 14-day trial) and sends a reminder notification to the
 * owner via the built-in notification system. If the workspace has a contactEmail,
 * it is included in the notification so the owner can follow up.
 */
import cron from "node-cron";
import { getDb } from "./db";
import { workspaces } from "../drizzle/schema";
import { and, gte, lte, eq } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";

async function sendDay10Reminders() {
  try {
    const db = await getDb();
    if (!db) return;

    const now = new Date();
    // Target: trialEndsAt is between 3.5 and 4.5 days from now (day 10 of 14)
    const windowStart = new Date(now.getTime() + 3.5 * 24 * 60 * 60 * 1000);
    const windowEnd   = new Date(now.getTime() + 4.5 * 24 * 60 * 60 * 1000);

    const dueWorkspaces = await db
      .select()
      .from(workspaces)
      .where(
        and(
          gte(workspaces.trialEndsAt, windowStart),
          lte(workspaces.trialEndsAt, windowEnd),
          eq(workspaces.onboardingComplete, true)
        )
      );

    for (const ws of dueWorkspaces) {
      const emailLine = (ws as any).contactEmail ? `\n📧 Contact email: ${(ws as any).contactEmail}` : "";
      const mobileLine = (ws as any).contactMobile ? `\n📱 Mobile: ${(ws as any).contactMobile}` : "";
      const trialEnd = ws.trialEndsAt ? new Date(ws.trialEndsAt).toLocaleDateString("en-AU") : "unknown";

      await notifyOwner({
        title: `⏰ Day 10 Trial Reminder — ${ws.name}`,
        content:
          `The workspace "${ws.name}" (ID: ${ws.id}) is on day 10 of their 14-day free trial.` +
          `\n\n🗓 Trial ends: ${trialEnd}` +
          emailLine +
          mobileLine +
          `\n\nPlease reach out to remind them to add their payment details before the trial expires.` +
          `\n\nDashboard: https://blastly.ai/dashboard`,
      });

      console.log(`[TrialReminder] Sent day-10 reminder for workspace ${ws.id} (${ws.name})`);
    }

    if (dueWorkspaces.length === 0) {
      console.log("[TrialReminder] No day-10 reminders due today.");
    }
  } catch (err) {
    console.error("[TrialReminder] Error running day-10 reminder job:", err);
  }
}

export function startTrialReminderCron() {
  // Run daily at 9:00 AM UTC
  cron.schedule("0 9 * * *", () => {
    console.log("[TrialReminder] Running day-10 trial reminder check...");
    sendDay10Reminders();
  });
  console.log("[TrialReminder] Day-10 trial reminder cron scheduled (daily at 09:00 UTC).");
}
