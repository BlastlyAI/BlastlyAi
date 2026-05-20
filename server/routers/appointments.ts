import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb, getMemberRole, incrementMonthlyStat } from "../db";
import {
  appointments, appointmentServices, loyaltySettings, loyaltyBalances,
  bookingPortalSettings, appointmentReminderTemplates, workspaces, contacts,
} from "../../drizzle/schema";
import { eq, and, gte, lte, desc, sql, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";

// ─── SMS helper (Twilio) ─────────────────────────────────────────────────────
async function sendSms(to: string, body: string) {
  const sid  = process.env.TWILIO_ACCOUNT_SID;
  const auth = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !auth || !from) {
    console.log("[SMS mock]", to, "→", body);
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const twilio = require("twilio")(sid, auth);
  await twilio.messages.create({ to, from, body });
}

// ─── Default reminder templates ──────────────────────────────────────────────
const DEFAULT_TEMPLATES = {
  confirmationSms: "Hi {{clientName}}, your {{serviceTitle}} appointment is confirmed for {{dateTime}}. Reply RESCHEDULE to change it. See you soon!",
  reminder24Sms:   "Hi {{clientName}}, reminder: your {{serviceTitle}} appointment is tomorrow at {{time}}. Reply RESCHEDULE if you need to change it.",
  reminder2Sms:    "Hi {{clientName}}, your {{serviceTitle}} appointment is in 2 hours ({{time}}). We look forward to seeing you!",
  reviewSms:       "Hi {{clientName}}, thanks for visiting {{bizName}}! We'd love your feedback — please leave us a Google Review: {{reviewUrl}} 🌟",
};

function fillTemplate(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}

// ─── Router ──────────────────────────────────────────────────────────────────
export const appointmentsRouter = router({

  // ── APPOINTMENTS ────────────────────────────────────────────────────────────

  /** List appointments for a workspace within a time range */
  listByRange: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      rangeStart:  z.number(),
      rangeEnd:    z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (!role) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      return db.select().from(appointments)
        .where(and(
          eq(appointments.workspaceId, input.workspaceId),
          gte(appointments.startAt, input.rangeStart),
          lte(appointments.startAt, input.rangeEnd),
        ))
        .orderBy(appointments.startAt);
    }),

  /** Get a single appointment */
  get: protectedProcedure
    .input(z.object({ workspaceId: z.number(), appointmentId: z.number() }))
    .query(async ({ input, ctx }) => {
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (!role) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [appt] = await db.select().from(appointments)
        .where(and(eq(appointments.id, input.appointmentId), eq(appointments.workspaceId, input.workspaceId)));
      if (!appt) throw new TRPCError({ code: "NOT_FOUND" });
      return appt;
    }),

  /** Create a new appointment */
  create: protectedProcedure
    .input(z.object({
      workspaceId:  z.number(),
      title:        z.string().min(1),
      clientName:   z.string().optional(),
      clientPhone:  z.string().optional(),
      clientEmail:  z.string().optional(),
      serviceId:    z.number().optional(),
      startAt:      z.number(),
      endAt:        z.number(),
      notes:        z.string().optional(),
      source:       z.string().default("manual"),
    }))
    .mutation(async ({ input, ctx }) => {
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (!role) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const bookingToken = crypto.randomBytes(24).toString("hex");

      const [result] = await db.insert(appointments).values({
        workspaceId: input.workspaceId,
        title:       input.title,
        clientName:  input.clientName,
        clientPhone: input.clientPhone,
        clientEmail: input.clientEmail,
        serviceId:   input.serviceId,
        startAt:     input.startAt,
        endAt:       input.endAt,
        notes:       input.notes,
        status:      "confirmed",
        source:      input.source,
        bookingToken,
        createdAt:   Date.now(),
        updatedAt:   Date.now(),
      });
      const id = (result as { insertId: number }).insertId;

      // Auto-send confirmation SMS
      if (input.clientPhone && input.clientName) {
        const [tmpl] = await db.select().from(appointmentReminderTemplates)
          .where(eq(appointmentReminderTemplates.workspaceId, input.workspaceId));
        const tplText = tmpl?.confirmationSms ?? DEFAULT_TEMPLATES.confirmationSms;
        const dateStr = new Date(input.startAt).toLocaleString("en-AU", {
          weekday: "short", day: "numeric", month: "short",
          hour: "2-digit", minute: "2-digit",
        });
        const msg = fillTemplate(tplText, {
          clientName: input.clientName,
          serviceTitle: input.title,
          dateTime: dateStr,
          time: dateStr,
        });
        await sendSms(input.clientPhone, msg);
        await db.update(appointments).set({ confirmationSent: true, updatedAt: Date.now() }).where(eq(appointments.id, id));
      }

      // Increment monthly stats counter
      incrementMonthlyStat(input.workspaceId, "appointmentsBooked").catch(() => {});

      return { id, bookingToken };
    }),

  /** Update appointment details */
  update: protectedProcedure
    .input(z.object({
      workspaceId:   z.number(),
      appointmentId: z.number(),
      title:         z.string().optional(),
      clientName:    z.string().optional(),
      clientPhone:   z.string().optional(),
      clientEmail:   z.string().optional(),
      serviceId:     z.number().optional(),
      startAt:       z.number().optional(),
      endAt:         z.number().optional(),
      notes:         z.string().optional(),
      status:        z.enum(["confirmed", "cancelled", "completed", "no_show"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (!role) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { workspaceId, appointmentId, ...fields } = input;
      await db.update(appointments)
        .set({ ...fields, updatedAt: Date.now() })
        .where(and(eq(appointments.id, appointmentId), eq(appointments.workspaceId, workspaceId)));
      return { ok: true };
    }),

  /** Delete an appointment */
  delete: protectedProcedure
    .input(z.object({ workspaceId: z.number(), appointmentId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (!role) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.delete(appointments)
        .where(and(eq(appointments.id, input.appointmentId), eq(appointments.workspaceId, input.workspaceId)));
      return { ok: true };
    }),

  /** Close out appointment — record payment, award loyalty points, send review SMS */
  closeOut: protectedProcedure
    .input(z.object({
      workspaceId:          z.number(),
      appointmentId:        z.number(),
      paymentMethod:        z.enum(["cash", "qr", "card"]),
      amountCents:          z.number(),
      redeemLoyaltyPoints:  z.number().default(0),
      notes:                z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (!role) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [appt] = await db.select().from(appointments)
        .where(and(eq(appointments.id, input.appointmentId), eq(appointments.workspaceId, input.workspaceId)));
      if (!appt) throw new TRPCError({ code: "NOT_FOUND" });
      if (appt.status === "completed") throw new TRPCError({ code: "BAD_REQUEST", message: "Already completed" });

      // Loyalty points calculation
      const [loySettings] = await db.select().from(loyaltySettings)
        .where(eq(loyaltySettings.workspaceId, input.workspaceId));
      const ptsPerDollar = loySettings?.pointsPerDollar ?? 2;
      const dollarsPerPt = loySettings?.dollarsPerPoint ?? 10;
      const loyaltyEnabled = loySettings?.isEnabled ?? false;
      const dollarsSpent = Math.floor(input.amountCents / 100);
      const pointsEarned = loyaltyEnabled ? dollarsSpent * ptsPerDollar : 0;

      // Update appointment
      await db.update(appointments).set({
        status:                "completed",
        paymentMethod:         input.paymentMethod,
        amountCents:           input.amountCents,
        loyaltyPointsEarned:   pointsEarned,
        loyaltyPointsRedeemed: input.redeemLoyaltyPoints,
        notes:                 input.notes ?? appt.notes,
        updatedAt:             Date.now(),
      }).where(eq(appointments.id, input.appointmentId));

      // Update loyalty balance if client has a contactId
      if (loyaltyEnabled && appt.contactId) {
        const [existing] = await db.select().from(loyaltyBalances)
          .where(and(eq(loyaltyBalances.workspaceId, input.workspaceId), eq(loyaltyBalances.contactId, appt.contactId)));
        if (existing) {
          await db.update(loyaltyBalances).set({
            pointsBalance: existing.pointsBalance + pointsEarned - input.redeemLoyaltyPoints,
            totalEarned:   existing.totalEarned + pointsEarned,
            totalRedeemed: existing.totalRedeemed + input.redeemLoyaltyPoints,
            updatedAt:     Date.now(),
          }).where(eq(loyaltyBalances.id, existing.id));
        } else {
          await db.insert(loyaltyBalances).values({
            workspaceId:   input.workspaceId,
            contactId:     appt.contactId,
            pointsBalance: pointsEarned - input.redeemLoyaltyPoints,
            totalEarned:   pointsEarned,
            totalRedeemed: input.redeemLoyaltyPoints,
            createdAt:     Date.now(),
            updatedAt:     Date.now(),
          });
        }
      }

      // Send thank-you + review SMS
      if (appt.clientPhone && appt.clientName) {
        const [ws] = await db.select().from(workspaces).where(eq(workspaces.id, input.workspaceId));
        const bizName = ws?.name ?? "us";
        const reviewUrl = (ws as Record<string, unknown>)?.googleReviewUrl as string ?? "";
        const [tmpl] = await db.select().from(appointmentReminderTemplates)
          .where(eq(appointmentReminderTemplates.workspaceId, input.workspaceId));
        const tplText = tmpl?.reviewSms ?? DEFAULT_TEMPLATES.reviewSms;
        const msg = fillTemplate(tplText, { clientName: appt.clientName, bizName, reviewUrl });
        await sendSms(appt.clientPhone, msg);
        await db.update(appointments).set({ reviewSent: true, updatedAt: Date.now() }).where(eq(appointments.id, input.appointmentId));
      }

      return {
        ok: true,
        pointsEarned,
        pointsDollarValue: loyaltyEnabled ? Math.floor(pointsEarned / dollarsPerPt) : 0,
      };
    }),

  /** Send a manual reminder SMS */
  sendReminder: protectedProcedure
    .input(z.object({ workspaceId: z.number(), appointmentId: z.number(), type: z.enum(["24h", "2h", "custom"]), customMessage: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (!role) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [appt] = await db.select().from(appointments)
        .where(and(eq(appointments.id, input.appointmentId), eq(appointments.workspaceId, input.workspaceId)));
      if (!appt || !appt.clientPhone || !appt.clientName) throw new TRPCError({ code: "NOT_FOUND" });

      const [tmpl] = await db.select().from(appointmentReminderTemplates)
        .where(eq(appointmentReminderTemplates.workspaceId, input.workspaceId));
      const timeStr = new Date(appt.startAt).toLocaleString("en-AU", { hour: "2-digit", minute: "2-digit" });
      let msg = input.customMessage ?? "";
      if (!msg) {
        const tplText = input.type === "24h"
          ? (tmpl?.reminder24Sms ?? DEFAULT_TEMPLATES.reminder24Sms)
          : (tmpl?.reminder2Sms ?? DEFAULT_TEMPLATES.reminder2Sms);
        msg = fillTemplate(tplText, { clientName: appt.clientName, serviceTitle: appt.title, time: timeStr });
      }
      await sendSms(appt.clientPhone, msg);
      const updateField = input.type === "24h" ? { reminder24Sent: true } : { reminder2Sent: true };
      await db.update(appointments).set({ ...updateField, updatedAt: Date.now() }).where(eq(appointments.id, input.appointmentId));
      return { ok: true };
    }),

  // ── SERVICES ────────────────────────────────────────────────────────────────

  listServices: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ input, ctx }) => {
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (!role) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      return db.select().from(appointmentServices)
        .where(and(eq(appointmentServices.workspaceId, input.workspaceId), eq(appointmentServices.isActive, true)));
    }),

  createService: protectedProcedure
    .input(z.object({
      workspaceId:     z.number(),
      name:            z.string().min(1),
      durationMinutes: z.number().min(5),
      priceCents:      z.number().min(0),
      description:     z.string().optional(),
      color:           z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (!role) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [result] = await db.insert(appointmentServices).values({
        ...input, isActive: true, createdAt: Date.now(), updatedAt: Date.now(),
      });
      return { id: (result as { insertId: number }).insertId };
    }),

  updateService: protectedProcedure
    .input(z.object({
      workspaceId:     z.number(),
      serviceId:       z.number(),
      name:            z.string().optional(),
      durationMinutes: z.number().optional(),
      priceCents:      z.number().optional(),
      description:     z.string().optional(),
      color:           z.string().optional(),
      isActive:        z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (!role) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { workspaceId, serviceId, ...fields } = input;
      await db.update(appointmentServices)
        .set({ ...fields, updatedAt: Date.now() })
        .where(and(eq(appointmentServices.id, serviceId), eq(appointmentServices.workspaceId, workspaceId)));
      return { ok: true };
    }),

  deleteService: protectedProcedure
    .input(z.object({ workspaceId: z.number(), serviceId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (!role) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.update(appointmentServices)
        .set({ isActive: false, updatedAt: Date.now() })
        .where(and(eq(appointmentServices.id, input.serviceId), eq(appointmentServices.workspaceId, input.workspaceId)));
      return { ok: true };
    }),

  // ── LOYALTY ─────────────────────────────────────────────────────────────────

  getLoyaltySettings: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ input, ctx }) => {
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (!role) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [settings] = await db.select().from(loyaltySettings)
        .where(eq(loyaltySettings.workspaceId, input.workspaceId));
      return settings ?? null;
    }),

  saveLoyaltySettings: protectedProcedure
    .input(z.object({
      workspaceId:      z.number(),
      isEnabled:        z.boolean(),
      pointsPerDollar:  z.number().min(1),
      dollarsPerPoint:  z.number().min(1),
      smsFrequencyDays: z.number().min(7),
    }))
    .mutation(async ({ input, ctx }) => {
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (!role) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [existing] = await db.select().from(loyaltySettings)
        .where(eq(loyaltySettings.workspaceId, input.workspaceId));
      if (existing) {
        await db.update(loyaltySettings).set({ ...input, updatedAt: Date.now() }).where(eq(loyaltySettings.id, existing.id));
      } else {
        await db.insert(loyaltySettings).values({ ...input, createdAt: Date.now(), updatedAt: Date.now() });
      }
      return { ok: true };
    }),

  getLoyaltyBalance: protectedProcedure
    .input(z.object({ workspaceId: z.number(), contactId: z.number() }))
    .query(async ({ input, ctx }) => {
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (!role) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [balance] = await db.select().from(loyaltyBalances)
        .where(and(eq(loyaltyBalances.workspaceId, input.workspaceId), eq(loyaltyBalances.contactId, input.contactId)));
      return balance ?? null;
    }),

  /** List all loyalty balances for a workspace (for the settings leaderboard) */
  listLoyaltyBalances: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ input, ctx }) => {
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (!role) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      // Join with contacts to get names
      const balanceRows = await db.select().from(loyaltyBalances)
        .where(eq(loyaltyBalances.workspaceId, input.workspaceId))
        .orderBy(desc(loyaltyBalances.pointsBalance));
      // Fetch contact names
      const contactIds = balanceRows.map(b => b.contactId).filter(Boolean) as number[];
      let contactMap: Record<number, string> = {};
      if (contactIds.length > 0) {
        const contactRows = await db
          .select({ id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName })
          .from(contacts)
          .where(inArray(contacts.id, contactIds));
        contactMap = Object.fromEntries(
          contactRows.map(c => [c.id, [c.firstName, c.lastName].filter(Boolean).join(" ")])
        );
      }
      return balanceRows.map(b => ({
        ...b,
        contactName: b.contactId ? (contactMap[b.contactId] ?? undefined) : undefined,
      }));
    }),

  // ── REMINDER TEMPLATES ──────────────────────────────────────────────────────

  getReminderTemplates: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ input, ctx }) => {
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (!role) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [tmpl] = await db.select().from(appointmentReminderTemplates)
        .where(eq(appointmentReminderTemplates.workspaceId, input.workspaceId));
      return tmpl ?? { ...DEFAULT_TEMPLATES, workspaceId: input.workspaceId };
    }),

  saveReminderTemplates: protectedProcedure
    .input(z.object({
      workspaceId:       z.number(),
      confirmationSms:   z.string().optional(),
      reminder24Sms:     z.string().optional(),
      reminder2Sms:      z.string().optional(),
      reviewSms:         z.string().optional(),
      confirmationEmail: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (!role) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [existing] = await db.select().from(appointmentReminderTemplates)
        .where(eq(appointmentReminderTemplates.workspaceId, input.workspaceId));
      if (existing) {
        await db.update(appointmentReminderTemplates).set({ ...input, updatedAt: Date.now() }).where(eq(appointmentReminderTemplates.id, existing.id));
      } else {
        await db.insert(appointmentReminderTemplates).values({ ...input, createdAt: Date.now(), updatedAt: Date.now() });
      }
      return { ok: true };
    }),

  // ── BOOKING PORTAL ──────────────────────────────────────────────────────────

  getBookingPortalSettings: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ input, ctx }) => {
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (!role) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [settings] = await db.select().from(bookingPortalSettings)
        .where(eq(bookingPortalSettings.workspaceId, input.workspaceId));
      return settings ?? null;
    }),

  saveBookingPortalSettings: protectedProcedure
    .input(z.object({
      workspaceId:    z.number(),
      isEnabled:      z.boolean(),
      slug:           z.string().min(3).max(64).regex(/^[a-z0-9-]+$/).optional(),
      welcomeMessage: z.string().optional(),
      businessHours:  z.string().optional(),
      bufferMinutes:  z.number().min(0).default(15),
      maxDaysAhead:   z.number().min(1).default(30),
    }))
    .mutation(async ({ input, ctx }) => {
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (!role) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [existing] = await db.select().from(bookingPortalSettings)
        .where(eq(bookingPortalSettings.workspaceId, input.workspaceId));
      if (existing) {
        await db.update(bookingPortalSettings).set({ ...input, updatedAt: Date.now() }).where(eq(bookingPortalSettings.id, existing.id));
      } else {
        await db.insert(bookingPortalSettings).values({ ...input, createdAt: Date.now(), updatedAt: Date.now() });
      }
      return { ok: true };
    }),

  /** Public: get available slots for a booking portal slug */
  getAvailableSlots: publicProcedure
    .input(z.object({
      slug:      z.string(),
      serviceId: z.number(),
      date:      z.string(), // YYYY-MM-DD
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [portal] = await db.select().from(bookingPortalSettings)
        .where(and(eq(bookingPortalSettings.slug, input.slug), eq(bookingPortalSettings.isEnabled, true)));
      if (!portal) throw new TRPCError({ code: "NOT_FOUND", message: "Booking portal not found" });

      const [service] = await db.select().from(appointmentServices)
        .where(and(eq(appointmentServices.id, input.serviceId), eq(appointmentServices.workspaceId, portal.workspaceId)));
      if (!service) throw new TRPCError({ code: "NOT_FOUND", message: "Service not found" });

      const hours = portal.businessHours ? JSON.parse(portal.businessHours) : null;
      const dayOfWeek = new Date(input.date).toLocaleDateString("en-US", { weekday: "short" }).toLowerCase();
      const dayHours = hours?.[dayOfWeek] ?? { open: "09:00", close: "17:00", enabled: true };
      if (!dayHours.enabled) return { slots: [] };

      const [openH, openM] = dayHours.open.split(":").map(Number);
      const [closeH, closeM] = dayHours.close.split(":").map(Number);
      const dateBase = new Date(input.date + "T00:00:00");
      const openMs = dateBase.getTime() + (openH * 60 + openM) * 60000;
      const closeMs = dateBase.getTime() + (closeH * 60 + closeM) * 60000;
      const slotMs = service.durationMinutes * 60000;
      const bufferMs = portal.bufferMinutes * 60000;

      // Get existing appointments for that day
      const existing = await db.select().from(appointments)
        .where(and(
          eq(appointments.workspaceId, portal.workspaceId),
          gte(appointments.startAt, openMs),
          lte(appointments.startAt, closeMs),
        ));

      const slots: { startAt: number; endAt: number }[] = [];
      let cursor = openMs;
      while (cursor + slotMs <= closeMs) {
        const slotEnd = cursor + slotMs;
        const conflict = existing.some(a =>
          (cursor < a.endAt && slotEnd > a.startAt)
        );
        if (!conflict) slots.push({ startAt: cursor, endAt: slotEnd });
        cursor += slotMs + bufferMs;
      }
      return { slots, service };
    }),

  /** Public: create a booking via the portal */
  createPortalBooking: publicProcedure
    .input(z.object({
      slug:        z.string(),
      serviceId:   z.number(),
      startAt:     z.number(),
      clientName:  z.string().min(1),
      clientPhone: z.string().optional(),
      clientEmail: z.string().optional(),
      notes:       z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [portal] = await db.select().from(bookingPortalSettings)
        .where(and(eq(bookingPortalSettings.slug, input.slug), eq(bookingPortalSettings.isEnabled, true)));
      if (!portal) throw new TRPCError({ code: "NOT_FOUND", message: "Booking portal not found" });

      const [service] = await db.select().from(appointmentServices)
        .where(and(eq(appointmentServices.id, input.serviceId), eq(appointmentServices.workspaceId, portal.workspaceId)));
      if (!service) throw new TRPCError({ code: "NOT_FOUND", message: "Service not found" });

      const endAt = input.startAt + service.durationMinutes * 60000;
      const bookingToken = crypto.randomBytes(24).toString("hex");

      const [result] = await db.insert(appointments).values({
        workspaceId: portal.workspaceId,
        title:       service.name,
        serviceId:   service.id,
        clientName:  input.clientName,
        clientPhone: input.clientPhone,
        clientEmail: input.clientEmail,
        startAt:     input.startAt,
        endAt,
        notes:       input.notes,
        status:      "confirmed",
        source:      "portal",
        bookingToken,
        createdAt:   Date.now(),
        updatedAt:   Date.now(),
      });
      const id = (result as { insertId: number }).insertId;

      // Send confirmation SMS
      if (input.clientPhone) {
        const dateStr = new Date(input.startAt).toLocaleString("en-AU", {
          weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
        });
        const [ws] = await db.select().from(workspaces).where(eq(workspaces.id, portal.workspaceId));
        const bizName = ws?.name ?? "us";
        await sendSms(input.clientPhone,
          `Hi ${input.clientName}, your ${service.name} appointment with ${bizName} is confirmed for ${dateStr}. To reschedule, visit: ${process.env.VITE_FRONTEND_FORGE_API_URL ?? ""}/reschedule/${bookingToken}`
        );
        await db.update(appointments).set({ confirmationSent: true, updatedAt: Date.now() }).where(eq(appointments.id, id));
      }

      // Increment monthly stats counter
      incrementMonthlyStat(portal.workspaceId, "appointmentsBooked").catch(() => {});

      return { id, bookingToken };
    }),

  /** Protected: get available slots for a workspace (used internally from Command Centre) */
  getInternalAvailableSlots: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      serviceId:   z.number(),
      date:        z.string(), // YYYY-MM-DD
    }))
    .query(async ({ input, ctx }) => {
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (!role) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [portal] = await db.select().from(bookingPortalSettings)
        .where(eq(bookingPortalSettings.workspaceId, input.workspaceId));
      const [service] = await db.select().from(appointmentServices)
        .where(and(eq(appointmentServices.id, input.serviceId), eq(appointmentServices.workspaceId, input.workspaceId)));
      if (!service) throw new TRPCError({ code: "NOT_FOUND", message: "Service not found" });
      const hours = portal?.businessHours ? JSON.parse(portal.businessHours) : null;
      const dayOfWeek = new Date(input.date).toLocaleDateString("en-US", { weekday: "short" }).toLowerCase();
      const dayHours = hours?.[dayOfWeek] ?? { open: "09:00", close: "17:00", enabled: true };
      if (!dayHours.enabled) return { slots: [], service };
      const [openH, openM] = dayHours.open.split(":").map(Number);
      const [closeH, closeM] = dayHours.close.split(":").map(Number);
      const dateBase = new Date(input.date + "T00:00:00");
      const openMs  = dateBase.getTime() + (openH * 60 + openM) * 60000;
      const closeMs = dateBase.getTime() + (closeH * 60 + closeM) * 60000;
      const slotMs   = service.durationMinutes * 60000;
      const bufferMs = (portal?.bufferMinutes ?? 15) * 60000;
      const existing = await db.select().from(appointments)
        .where(and(
          eq(appointments.workspaceId, input.workspaceId),
          gte(appointments.startAt, openMs),
          lte(appointments.startAt, closeMs),
        ));
      const slots: { startAt: number; endAt: number }[] = [];
      let cursor = openMs;
      while (cursor + slotMs <= closeMs) {
        const slotEnd = cursor + slotMs;
        const conflict = existing.some(a => cursor < a.endAt && slotEnd > a.startAt);
        if (!conflict) slots.push({ startAt: cursor, endAt: slotEnd });
        cursor += slotMs + bufferMs;
      }
      return { slots, service };
    }),

  /** Protected: book an appointment directly from a lead in the Command Centre */
  bookFromLead: protectedProcedure
    .input(z.object({
      workspaceId:  z.number(),
      serviceId:    z.number(),
      startAt:      z.number(),
      endAt:        z.number(),
      clientName:   z.string().min(1),
      clientPhone:  z.string().optional(),
      clientEmail:  z.string().optional(),
      notes:        z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (!role) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [service] = await db.select().from(appointmentServices)
        .where(and(eq(appointmentServices.id, input.serviceId), eq(appointmentServices.workspaceId, input.workspaceId)));
      if (!service) throw new TRPCError({ code: "NOT_FOUND", message: "Service not found" });
      const bookingToken = crypto.randomBytes(24).toString("hex");
      const [result] = await db.insert(appointments).values({
        workspaceId: input.workspaceId,
        title:       service.name,
        clientName:  input.clientName,
        clientPhone: input.clientPhone,
        clientEmail: input.clientEmail,
        serviceId:   input.serviceId,
        startAt:     input.startAt,
        endAt:       input.endAt,
        notes:       input.notes,
        status:      "confirmed",
        source:      "command_centre",
        bookingToken,
        createdAt:   Date.now(),
        updatedAt:   Date.now(),
      });
      const id = (result as { insertId: number }).insertId;
      if (input.clientPhone && input.clientName) {
        const [tmpl] = await db.select().from(appointmentReminderTemplates)
          .where(eq(appointmentReminderTemplates.workspaceId, input.workspaceId));
        const tplText = tmpl?.confirmationSms ?? DEFAULT_TEMPLATES.confirmationSms;
        const dateStr = new Date(input.startAt).toLocaleString("en-AU", {
          weekday: "short", day: "numeric", month: "short",
          hour: "2-digit", minute: "2-digit",
        });
        const msg = fillTemplate(tplText, {
          clientName:   input.clientName,
          serviceTitle: service.name,
          dateTime:     dateStr,
          time:         dateStr,
        });
        await sendSms(input.clientPhone, msg);
        await db.update(appointments).set({ confirmationSent: true, updatedAt: Date.now() }).where(eq(appointments.id, id));
      }
      // Increment monthly stats counter
      incrementMonthlyStat(input.workspaceId, "appointmentsBooked").catch(() => {});

      return { id, bookingToken };
    }),
});
