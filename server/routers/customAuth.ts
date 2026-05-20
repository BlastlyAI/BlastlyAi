/**
 * customAuth.ts
 * Blastly-branded email/password authentication procedures.
 * Runs alongside Manus OAuth — uses the same JWT cookie so all
 * existing protectedProcedure / ctx.user logic continues to work.
 */
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { users, passwordResetTokens } from "../../drizzle/schema";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { sdk } from "../_core/sdk";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { notifyOwner } from "../_core/notification";
import type { Response } from "express";

const SALT_ROUNDS = 12;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// ── helpers ──────────────────────────────────────────────────────────────────

function setCookieOnResponse(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: ONE_YEAR_MS,
    path: "/",
  });
}

async function sendResetEmail(email: string, name: string | null, resetUrl: string) {
  await notifyOwner({
    title: `Password reset requested — ${email}`,
    content: `User ${name ?? email} requested a password reset.\n\nReset link (expires in 1 hour):\n${resetUrl}\n\nIf you did not request this, ignore this message.`,
  });
}

// ── router ───────────────────────────────────────────────────────────────────

export const customAuthRouter = router({
  /**
   * Sign up with email + password.
   */
  signup: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8, "Password must be at least 8 characters"),
        name: z.string().min(1, "Name is required"),
        businessName: z.string().optional(),
        industrySlug: z.string().optional(),
        agreedToTerms: z.boolean().refine((v) => v === true, "You must agree to the terms"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (existing.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with this email already exists. Please log in.",
        });
      }

      const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
      const openId = `blastly_${crypto.randomBytes(16).toString("hex")}`;

      await db.insert(users).values({
        openId,
        name: input.name,
        email: input.email,
        loginMethod: "email",
        passwordHash,
        isEmailVerified: false,
        welcomeCompleted: false,
        businessName: input.businessName ?? null,
        industrySlug: input.industrySlug ?? null,
      });

      const newUsers = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      const newUser = newUsers[0];
      if (!newUser) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Signup failed" });

      const token = await sdk.createSessionToken(openId, { name: input.name });
      setCookieOnResponse(ctx.res, token);

      await notifyOwner({
        title: `New Blastly signup — ${input.email}`,
        content: `${input.name} (${input.email}) signed up${input.businessName ? ` — ${input.businessName}` : ""}.`,
      }).catch(() => {});

      return {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        welcomeCompleted: newUser.welcomeCompleted,
      };
    }),

  /**
   * Log in with email + password.
   */
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const rows = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      const user = rows[0];

      if (!user || !user.passwordHash) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password.",
        });
      }

      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password.",
        });
      }

      await db
        .update(users)
        .set({ lastSignedIn: new Date() })
        .where(eq(users.id, user.id));

      const token = await sdk.createSessionToken(user.openId, { name: user.name ?? "" });
      setCookieOnResponse(ctx.res, token);

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        welcomeCompleted: user.welcomeCompleted,
      };
    }),

  /**
   * Forgot password — sends a reset link via email.
   */
  forgotPassword: publicProcedure
    .input(z.object({ email: z.string().email(), origin: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { sent: true };

      const rows = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      const user = rows[0];

      // Always return success to prevent email enumeration
      if (!user || !user.passwordHash) {
        return { sent: true };
      }

      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = Date.now() + RESET_TOKEN_TTL_MS;

      await db.insert(passwordResetTokens).values({
        userId: user.id,
        token,
        expiresAt,
        createdAt: Date.now(),
      });

      const resetUrl = `${input.origin}/reset-password?token=${token}`;
      await sendResetEmail(input.email, user.name, resetUrl).catch(() => {});

      return { sent: true };
    }),

  /**
   * Reset password using a valid token.
   */
  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string(),
        newPassword: z.string().min(8, "Password must be at least 8 characters"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const resetRows = await db
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.token, input.token))
        .limit(1);

      const resetRow = resetRows[0];

      if (!resetRow || resetRow.usedAt || resetRow.expiresAt < Date.now()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This reset link is invalid or has expired. Please request a new one.",
        });
      }

      const passwordHash = await bcrypt.hash(input.newPassword, SALT_ROUNDS);

      await db
        .update(users)
        .set({ passwordHash })
        .where(eq(users.id, resetRow.userId));

      await db
        .update(passwordResetTokens)
        .set({ usedAt: Date.now() })
        .where(eq(passwordResetTokens.id, resetRow.id));

      // Auto-login after reset
      const userRows = await db
        .select()
        .from(users)
        .where(eq(users.id, resetRow.userId))
        .limit(1);

      const user = userRows[0];
      if (user) {
        const token = await sdk.createSessionToken(user.openId, { name: user.name ?? "" });
        setCookieOnResponse(ctx.res, token);
      }

      return { success: true };
    }),

  /**
   * Mark welcome screen as completed for the current user.
   */
  completeWelcome: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    await db
      .update(users)
      .set({ welcomeCompleted: true })
      .where(eq(users.id, ctx.user.id));

    return { done: true };
  }),

  /**
   * Get current auth status.
   */
  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return null;
    return {
      id: ctx.user.id,
      name: ctx.user.name,
      email: ctx.user.email,
      welcomeCompleted: ctx.user.welcomeCompleted,
    };
  }),
});
