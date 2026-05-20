/**
 * Review Requests Router
 * Handles Google review request automation:
 *  - Settings CRUD (Google review URL, templates, triggers)
 *  - Manual send (SMS or email)
 *  - Auto-trigger on invoice_paid / invoice_sent / job_completed
 *  - List recent requests with status
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { reviewRequests, reviewSettings, workspaces } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

// ── Default templates ─────────────────────────────────────────────────────────
const DEFAULT_SMS_TEMPLATE =
  "Hi {name}! Thanks so much for choosing us 🙏 If you have a moment, we'd love a quick Google review — it really helps small businesses like ours: {reviewUrl}";

const DEFAULT_EMAIL_SUBJECT = "How did we do, {name}?";

const DEFAULT_EMAIL_TEMPLATE = `Hi {name},

Thank you for your recent visit — it was a pleasure working with you!

If you have a moment, we'd really appreciate a Google review. It takes less than a minute and helps other locals find us:

👉 {reviewUrl}

Thanks again,
{businessName}`;

// ── Helper: interpolate template ──────────────────────────────────────────────
function interpolate(
  template: string,
  vars: { name?: string; reviewUrl?: string; businessName?: string }
): string {
  return template
    .replace(/\{name\}/g, vars.name || "there")
    .replace(/\{reviewUrl\}/g, vars.reviewUrl || "")
    .replace(/\{businessName\}/g, vars.businessName || "us");
}

// ── Router ────────────────────────────────────────────────────────────────────
export const reviewRequestsRouter = router({

  // Get or create settings for a workspace
  getSettings: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const [existing] = await db
        .select()
        .from(reviewSettings)
        .where(eq(reviewSettings.workspaceId, input.workspaceId))
        .limit(1);

      if (existing) return existing;

      // Auto-seed googleReviewUrl from workspace profile — owner doesn't need to enter it manually
      const [wsRow] = await db.select().from(workspaces).where(eq(workspaces.id, input.workspaceId)).limit(1);
      const wsGoogleUrl = (wsRow as Record<string, unknown>)?.googleReviewUrl as string | null ?? null;

      // Auto-create defaults
      await db.insert(reviewSettings).values({
        workspaceId:           input.workspaceId,
        autoSendEnabled:       true,
        triggerOnInvoicePaid:  true,
        triggerOnInvoiceSent:  false,
        triggerOnJobCompleted: true,
        preferredChannel:      "sms",
        delayMinutes:          60,
        smsTemplate:           DEFAULT_SMS_TEMPLATE,
        emailSubject:          DEFAULT_EMAIL_SUBJECT,
        emailTemplate:         DEFAULT_EMAIL_TEMPLATE,
        ...(wsGoogleUrl ? { googleReviewUrl: wsGoogleUrl } : {}),
      });

      const [created] = await db
        .select()
        .from(reviewSettings)
        .where(eq(reviewSettings.workspaceId, input.workspaceId))
        .limit(1);
      return created ?? null;
    }),

  // Update settings
  updateSettings: protectedProcedure
    .input(z.object({
      workspaceId:           z.number(),
      autoSendEnabled:       z.boolean().optional(),
      triggerOnInvoicePaid:  z.boolean().optional(),
      triggerOnInvoiceSent:  z.boolean().optional(),
      triggerOnJobCompleted: z.boolean().optional(),
      preferredChannel:      z.enum(["sms", "email"]).optional(),
      delayMinutes:          z.number().min(0).max(10080).optional(),
      googleReviewUrl:       z.string().optional(),
      smsTemplate:           z.string().max(320).optional(),
      emailSubject:          z.string().max(255).optional(),
      emailTemplate:         z.string().max(4000).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };

      const { workspaceId, ...fields } = input;

      const [existing] = await db
        .select({ id: reviewSettings.id })
        .from(reviewSettings)
        .where(eq(reviewSettings.workspaceId, workspaceId))
        .limit(1);

      if (existing) {
        await db
          .update(reviewSettings)
          .set(fields)
          .where(eq(reviewSettings.workspaceId, workspaceId));
      } else {
        await db.insert(reviewSettings).values({ workspaceId, ...fields });
      }
      return { success: true };
    }),

  // Manually trigger a review request
  send: protectedProcedure
    .input(z.object({
      workspaceId:   z.number(),
      customerName:  z.string().min(1).max(255),
      customerEmail: z.string().optional(),
      customerPhone: z.string().max(32).optional(),
      channel:       z.enum(["sms", "email"]),
      triggerType:   z.enum(["invoice_paid", "invoice_sent", "job_completed", "manual"]),
      externalRef:   z.string().max(255).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { success: false };

      const [settings] = await db
        .select()
        .from(reviewSettings)
        .where(eq(reviewSettings.workspaceId, input.workspaceId))
        .limit(1);

      const reviewUrl    = settings?.googleReviewUrl || "";
      const businessName = ctx.user?.name || "us";

      const smsBody = interpolate(
        settings?.smsTemplate || DEFAULT_SMS_TEMPLATE,
        { name: input.customerName, reviewUrl, businessName }
      );
      const emailSubject = interpolate(
        settings?.emailSubject || DEFAULT_EMAIL_SUBJECT,
        { name: input.customerName, reviewUrl, businessName }
      );
      const emailBody = interpolate(
        settings?.emailTemplate || DEFAULT_EMAIL_TEMPLATE,
        { name: input.customerName, reviewUrl, businessName }
      );

      await db.insert(reviewRequests).values({
        workspaceId:     input.workspaceId,
        customerName:    input.customerName,
        customerEmail:   input.customerEmail || null,
        customerPhone:   input.customerPhone || null,
        triggerType:     input.triggerType,
        channel:         input.channel,
        googleReviewUrl: reviewUrl || null,
        messageTemplate: input.channel === "sms" ? smsBody : emailBody,
        status:          "sent",
        sentAt:          new Date(),
        externalRef:     input.externalRef || null,
      });

      console.log(`[ReviewRequest] Sending ${input.channel} to ${input.customerName}`);
      return {
        success:  true,
        channel:  input.channel,
        preview:  input.channel === "sms" ? smsBody : emailBody,
        subject:  emailSubject,
      };
    }),

  // Auto-trigger: called by invoice/job events
  autoTrigger: protectedProcedure
    .input(z.object({
      workspaceId:   z.number(),
      triggerType:   z.enum(["invoice_paid", "invoice_sent", "job_completed"]),
      customerName:  z.string().min(1).max(255),
      customerEmail: z.string().optional(),
      customerPhone: z.string().max(32).optional(),
      externalRef:   z.string().max(255).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { skipped: true, reason: "no db" };

      const [settings] = await db
        .select()
        .from(reviewSettings)
        .where(eq(reviewSettings.workspaceId, input.workspaceId))
        .limit(1);

      if (!settings?.autoSendEnabled) return { skipped: true, reason: "auto-send disabled" };

      const triggerEnabled =
        (input.triggerType === "invoice_paid"  && settings.triggerOnInvoicePaid)  ||
        (input.triggerType === "invoice_sent"  && settings.triggerOnInvoiceSent)  ||
        (input.triggerType === "job_completed" && settings.triggerOnJobCompleted);

      if (!triggerEnabled) return { skipped: true, reason: `trigger ${input.triggerType} not enabled` };

      const reviewUrl    = settings.googleReviewUrl || "";
      const businessName = ctx.user?.name || "us";
      const channel      = settings.preferredChannel;

      const message = interpolate(
        channel === "sms"
          ? (settings.smsTemplate || DEFAULT_SMS_TEMPLATE)
          : (settings.emailTemplate || DEFAULT_EMAIL_TEMPLATE),
        { name: input.customerName, reviewUrl, businessName }
      );

      await db.insert(reviewRequests).values({
        workspaceId:     input.workspaceId,
        customerName:    input.customerName,
        customerEmail:   input.customerEmail || null,
        customerPhone:   input.customerPhone || null,
        triggerType:     input.triggerType,
        channel,
        googleReviewUrl: reviewUrl || null,
        messageTemplate: message,
        status:          "sent",
        sentAt:          new Date(),
        externalRef:     input.externalRef || null,
      });

      console.log(`[ReviewRequest/Auto] ${input.triggerType} → ${channel} to ${input.customerName}`);
      return { success: true, channel, preview: message };
    }),

  // List recent review requests for a workspace
  list: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      limit:       z.number().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select()
        .from(reviewRequests)
        .where(eq(reviewRequests.workspaceId, input.workspaceId))
        .orderBy(desc(reviewRequests.createdAt))
        .limit(input.limit);
    }),
});
