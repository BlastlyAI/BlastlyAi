import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb, getWorkspaceById, getMemberRole, incrementMonthlyStat } from "../db";
import { contacts, smsCampaigns, smsCampaignRecipients } from "../../drizzle/schema";
import { eq, and, like, or, isNull, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
// ─── Helpers ─────────────────────────────────────────────────────────────────
function parseTags(tagStr: string | null | undefined): string[] {
  if (!tagStr) return [];
  return tagStr.split(",").map(t => t.trim()).filter(Boolean);
}

function mergeName(template: string, firstName: string, lastName?: string | null) {
  const full = [firstName, lastName].filter(Boolean).join(" ");
  return template
    .replace(/\{name\}/gi, firstName)
    .replace(/\{fullname\}/gi, full)
    .replace(/\{first\}/gi, firstName)
    .replace(/\{last\}/gi, lastName || "");
}

function getTwilioClient() {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Twilio = require("twilio");
    return new Twilio(sid, token);
  } catch {
    return null;
  }
}

// ─── Access guard ───────────────────────────────────────────────────────────
async function assertAccess(workspaceId: number, userId: number) {
  const ws = await getWorkspaceById(workspaceId);
  if (!ws) throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
  if (ws.ownerId !== userId) {
    const role = await getMemberRole(workspaceId, userId);
    if (!role) throw new TRPCError({ code: "FORBIDDEN" });
  }
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const contactsRouter = router({

  // ── List contacts ──────────────────────────────────────────────────────────
  list: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      search:      z.string().optional(),
      tag:         z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      await assertAccess(input.workspaceId, ctx.user.id);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const conditions: ReturnType<typeof eq>[] = [eq(contacts.workspaceId, input.workspaceId)];
      if (input.tag) conditions.push(like(contacts.tags, `%${input.tag}%`));
      let rows = await db.select().from(contacts)
        .where(and(...conditions))
        .orderBy(contacts.firstName);
      if (input.search) {
        const s = input.search.toLowerCase();
        rows = rows.filter(r =>
          r.firstName.toLowerCase().includes(s) ||
          (r.lastName || "").toLowerCase().includes(s) ||
          (r.phone || "").includes(s) ||
          (r.email || "").toLowerCase().includes(s)
        );
      }
      return rows.map(r => ({ ...r, tags: parseTags(r.tags) }));
    }),

  // ── Add contact ────────────────────────────────────────────────────────────
  add: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      firstName:   z.string().min(1),
      lastName:    z.string().optional(),
      phone:       z.string().optional(),
      email:       z.string().email().optional().or(z.literal("")),
      tags:        z.array(z.string()).optional(),
      notes:       z.string().optional(),
      source:      z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertAccess(input.workspaceId, ctx.user.id);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(contacts).values({
        workspaceId: input.workspaceId,
        firstName:   input.firstName,
        lastName:    input.lastName || null,
        phone:       input.phone || null,
        email:       input.email || null,
        tags:        input.tags?.join(",") || null,
        notes:       input.notes || null,
        source:      input.source || "manual",
      });
      // Increment monthly stats counter
      incrementMonthlyStat(input.workspaceId, "newEnquiries").catch(() => {});

      return { id: (result as any).insertId };
    }),

  // ── Edit contact ───────────────────────────────────────────────────────────
  edit: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      id:          z.number(),
      firstName:   z.string().min(1).optional(),
      lastName:    z.string().optional(),
      phone:       z.string().optional(),
      email:       z.string().email().optional().or(z.literal("")),
      tags:        z.array(z.string()).optional(),
      notes:       z.string().optional(),
      optedOut:    z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertAccess(input.workspaceId, ctx.user.id);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, workspaceId, tags, ...rest } = input;
      await db.update(contacts)
        .set({ ...rest, tags: tags?.join(",") ?? undefined })
        .where(and(eq(contacts.id, id), eq(contacts.workspaceId, workspaceId)));
      return { ok: true };
    }),

  // ── Delete contact ─────────────────────────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ workspaceId: z.number(), id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await assertAccess(input.workspaceId, ctx.user.id);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(contacts)
        .where(and(eq(contacts.id, input.id), eq(contacts.workspaceId, input.workspaceId)));
      return { ok: true };
    }),

  // ── Get all unique tags for workspace ──────────────────────────────────────
  listTags: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ ctx, input }) => {
      await assertAccess(input.workspaceId, ctx.user.id);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select({ tags: contacts.tags })
        .from(contacts)
        .where(eq(contacts.workspaceId, input.workspaceId));
      const tagSet = new Set<string>();
      rows.forEach(r => parseTags(r.tags).forEach(t => tagSet.add(t)));
      return Array.from(tagSet).sort();
    }),

  // ── Bulk import (array of contacts) ────────────────────────────────────────
  bulkImport: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      contacts: z.array(z.object({
        firstName: z.string().min(1),
        lastName:  z.string().optional(),
        phone:     z.string().optional(),
        email:     z.string().optional(),
        tags:      z.string().optional(),  // comma-separated
        notes:     z.string().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertAccess(input.workspaceId, ctx.user.id);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (input.contacts.length === 0) return { inserted: 0 };
      const rows = input.contacts.map(c => ({
        workspaceId: input.workspaceId,
        firstName:   c.firstName,
        lastName:    c.lastName || null,
        phone:       c.phone || null,
        email:       c.email || null,
        tags:        c.tags || null,
        notes:       c.notes || null,
        source:      "csv" as const,
      }));
      await db.insert(contacts).values(rows);
      return { inserted: rows.length };
    }),

  // ── List campaigns ─────────────────────────────────────────────────────────
  listCampaigns: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ ctx, input }) => {
      await assertAccess(input.workspaceId, ctx.user.id);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return db.select().from(smsCampaigns)
        .where(eq(smsCampaigns.workspaceId, input.workspaceId))
        .orderBy(sql`${smsCampaigns.createdAt} DESC`);
    }),

  // ── Create & send campaign ─────────────────────────────────────────────────
  sendCampaign: protectedProcedure
    .input(z.object({
      workspaceId:     z.number(),
      name:            z.string().min(1),
      messageTemplate: z.string().min(1),
      mediaUrl:        z.string().optional(),
      tagFilter:       z.string().optional(),  // comma-separated tags, empty = all
      deliveryChannel: z.enum(["sms", "social", "both"]).default("sms"),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertAccess(input.workspaceId, ctx.user.id);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // 1. Fetch matching contacts (with phone, not opted out)
      let allContacts = await db.select().from(contacts)
        .where(and(
          eq(contacts.workspaceId, input.workspaceId),
          eq(contacts.optedOut, false),
        ));

      if (input.tagFilter) {
        const tags = input.tagFilter.split(",").map(t => t.trim()).filter(Boolean);
        if (tags.length > 0) {
          allContacts = allContacts.filter(c =>
            tags.some(t => (c.tags || "").includes(t))
          );
        }
      }

      const smsContacts = allContacts.filter(c => c.phone);

      if (smsContacts.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No contacts with phone numbers match this filter." });
      }

      // 2. Create campaign record
      const [res] = await db.insert(smsCampaigns).values({
        workspaceId:     input.workspaceId,
        name:            input.name,
        messageTemplate: input.messageTemplate,
        mediaUrl:        input.mediaUrl || null,
        tagFilter:       input.tagFilter || null,
        deliveryChannel: input.deliveryChannel,
        status:          "sending",
        totalRecipients: smsContacts.length,
      });
      const campaignId = (res as any).insertId as number;

      // 3. Insert recipient rows
      const recipientRows = smsContacts.map((c: typeof smsContacts[0]) => ({
        campaignId,
        contactId:   c.id,
        phone:       c.phone!,
        personalised: mergeName(input.messageTemplate, c.firstName, c.lastName),
        status:      "queued" as const,
      }));
      await db.insert(smsCampaignRecipients).values(recipientRows);

      // 4. Attempt Twilio send (graceful fallback if not configured)
      const twilioClient = getTwilioClient();
      const fromNumber   = process.env.TWILIO_FROM_NUMBER;
      let sentCount   = 0;
      let failedCount = 0;

      if (twilioClient && fromNumber && input.deliveryChannel !== "social") {
        for (const r of recipientRows) {
          try {
            const msg = await twilioClient.messages.create({
              to:   r.phone,
              from: fromNumber,
              body: r.personalised || input.messageTemplate,
              ...(input.mediaUrl ? { mediaUrl: [input.mediaUrl] } : {}),
            });
            await db.update(smsCampaignRecipients)
              .set({ status: "sent", sentAt: new Date(), externalRef: msg.sid })
              .where(and(
                eq(smsCampaignRecipients.campaignId, campaignId),
                eq(smsCampaignRecipients.contactId, r.contactId),
              ));
            sentCount++;
          } catch {
            await db.update(smsCampaignRecipients)
              .set({ status: "failed" })
              .where(and(
                eq(smsCampaignRecipients.campaignId, campaignId),
                eq(smsCampaignRecipients.contactId, r.contactId),
              ));
            failedCount++;
          }
        }
      } else {
        // Twilio not configured — mark as "sent" (demo mode)
        sentCount = smsContacts.length;
        await db.update(smsCampaignRecipients)
          .set({ status: "sent", sentAt: new Date() })
          .where(eq(smsCampaignRecipients.campaignId, campaignId));
      }

      // 5. Update campaign status
      await db.update(smsCampaigns)
        .set({ status: "sent", sentAt: new Date(), sentCount, failedCount })
        .where(eq(smsCampaigns.id, campaignId));

      return {
        campaignId,
        totalRecipients: smsContacts.length,
        sentCount,
        failedCount,
        twilioConfigured: !!(twilioClient && fromNumber),
      };
    }),

  // ── Preview personalised messages ──────────────────────────────────────────
  previewCampaign: protectedProcedure
    .input(z.object({
      workspaceId:     z.number(),
      messageTemplate: z.string(),
      tagFilter:       z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      await assertAccess(input.workspaceId, ctx.user.id);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      let matched = await db.select().from(contacts)
        .where(and(
          eq(contacts.workspaceId, input.workspaceId),
          eq(contacts.optedOut, false),
        ));
      if (input.tagFilter) {
        const tags = input.tagFilter.split(",").map(t => t.trim()).filter(Boolean);
        if (tags.length > 0) {
          matched = matched.filter(c => tags.some(t => (c.tags || "").includes(t)));
        }
      }
      matched = matched.slice(0, 5);
      return {
        totalCount: matched.length,
        previews: matched.map(c => ({
          name:    [c.firstName, c.lastName].filter(Boolean).join(" "),
          phone:   c.phone,
          message: mergeName(input.messageTemplate, c.firstName, c.lastName),
        })),
      };
    }),
});
