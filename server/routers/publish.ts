/**
 * Social Publishing Router
 * Handles Bluesky app-password connection and publishing to
 * LinkedIn, YouTube, Pinterest, and Bluesky.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { socialAccounts } from "../../drizzle/schema";
import { upsertSocialAccount, getMemberRole, getWorkspaceById } from "../db";

// ─── Bluesky App-Password Connect ─────────────────────────────────────────────

async function blueskyLogin(identifier: string, appPassword: string) {
  const res = await fetch("https://bsky.social/xrpc/com.atproto.server.createSession", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password: appPassword }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as any;
    throw new Error(err.message ?? `Bluesky login failed: ${res.status}`);
  }
  return res.json() as Promise<{
    did: string; handle: string; displayName?: string;
    accessJwt: string; refreshJwt: string;
  }>;
}

// ─── LinkedIn Publishing (personal profile via /v2/shares — no follower requirement) ──

export async function publishToLinkedIn(accessToken: string, authorUrn: string, text: string, mediaUrls?: string[]) {
  // Use /v2/shares which works for personal profiles without Marketing Developer Platform approval
  const body: any = {
    owner: authorUrn,
    subject: text.substring(0, 200),
    text: { text },
    distribution: {
      linkedInDistributionTarget: {
        visibleToGuest: true,
        connectionsOnly: false,
      },
    },
    content: mediaUrls?.length ? {
      contentEntities: mediaUrls.map((url) => ({ entityLocation: url })),
      title: text.substring(0, 200),
    } : undefined,
  };

  const res = await fetch("https://api.linkedin.com/v2/shares", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    let errMsg = `LinkedIn publish failed: ${res.status}`;
    try { errMsg = JSON.parse(errText).message ?? errMsg; } catch {}
    throw new Error(errMsg);
  }
  const data = await res.json() as any;
  return { platformPostId: data.id ?? "unknown" };
}

// ─── Pinterest Publishing ──────────────────────────────────────────────────────

export async function publishToPinterest(accessToken: string, boardId: string, text: string, mediaUrl?: string) {
  const body: any = {
    board_id: boardId,
    title: text.substring(0, 100),
    description: text,
    ...(mediaUrl ? { media_source: { source_type: "image_url", url: mediaUrl } } : {}),
  };

  const res = await fetch("https://api.pinterest.com/v5/pins", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as any;
    throw new Error(err.message ?? `Pinterest publish failed: ${res.status}`);
  }
  const data = await res.json() as any;
  return { platformPostId: data.id ?? "unknown" };
}

// ─── Bluesky Publishing ────────────────────────────────────────────────────────

export async function publishToBluesky(accessJwt: string, did: string, text: string) {
  const res = await fetch("https://bsky.social/xrpc/com.atproto.repo.createRecord", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessJwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      repo: did,
      collection: "app.bsky.feed.post",
      record: {
        $type: "app.bsky.feed.post",
        text,
        createdAt: new Date().toISOString(),
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as any;
    throw new Error(err.message ?? `Bluesky publish failed: ${res.status}`);
  }
  const data = await res.json() as any;
  return { platformPostId: data.uri ?? "unknown" };
}

// ─── YouTube — post as community post ─────────────────────────────────────────

export async function publishToYouTube(accessToken: string, text: string) {
  // YouTube community posts API (requires channel with 500+ subscribers in production)
  const res = await fetch(
    "https://www.googleapis.com/youtube/v3/communityPosts?part=snippet",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        snippet: { textOriginal: text },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as any;
    throw new Error(err.error?.message ?? `YouTube publish failed: ${res.status}`);
  }
  const data = await res.json() as any;
  return { platformPostId: data.id ?? "unknown" };
}

// ─── tRPC Router ──────────────────────────────────────────────────────────────

export const publishRouter = router({
  /** Connect Bluesky via app password */
  connectBluesky: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      handle: z.string().min(1),
      appPassword: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const ws = await getWorkspaceById(input.workspaceId);
      if (!ws) throw new TRPCError({ code: "NOT_FOUND" });
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (ws.ownerId !== ctx.user.id && role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });

      const session = await blueskyLogin(input.handle, input.appPassword);

      await upsertSocialAccount({
        workspaceId: input.workspaceId,
        userId: ctx.user.id,
        platform: "bluesky",
        platformAccountId: session.did,
        platformUsername: session.handle,
        platformDisplayName: session.displayName ?? session.handle,
        accessToken: session.accessJwt,
        refreshToken: session.refreshJwt,
        scopes: "atproto",
      });

      return { success: true, handle: session.handle, displayName: session.displayName };
    }),

  /** Publish a post to a connected social account */
  publish: protectedProcedure
    .input(z.object({
      socialAccountId: z.number(),
      workspaceId: z.number(),
      text: z.string().min(1),
      mediaUrls: z.array(z.string()).optional(),
      boardId: z.string().optional(), // Pinterest only
    }))
    .mutation(async ({ ctx, input }) => {
      const ws = await getWorkspaceById(input.workspaceId);
      if (!ws) throw new TRPCError({ code: "NOT_FOUND" });
      const role = await getMemberRole(input.workspaceId, ctx.user.id);
      if (ws.ownerId !== ctx.user.id && role !== "admin" && role !== "editor") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [account] = await db.select().from(socialAccounts)
        .where(eq(socialAccounts.id, input.socialAccountId))
        .limit(1);

      if (!account) throw new TRPCError({ code: "NOT_FOUND", message: "Social account not found" });
      if (!account.isActive) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Account is disconnected" });
      if (!account.accessToken) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No access token — please reconnect" });

      let result: { platformPostId: string };

      switch (account.platform) {
        case "linkedin": {
          // The platformAccountId for LinkedIn is the user's sub (URN)
          const authorUrn = account.platformAccountId.startsWith("urn:")
            ? account.platformAccountId
            : `urn:li:person:${account.platformAccountId}`;
          result = await publishToLinkedIn(account.accessToken, authorUrn, input.text, input.mediaUrls);
          break;
        }
        case "pinterest": {
          if (!input.boardId) throw new TRPCError({ code: "BAD_REQUEST", message: "boardId required for Pinterest" });
          result = await publishToPinterest(account.accessToken, input.boardId, input.text, input.mediaUrls?.[0]);
          break;
        }
        case "bluesky": {
          if (!account.platformAccountId) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Missing DID" });
          result = await publishToBluesky(account.accessToken, account.platformAccountId, input.text);
          break;
        }
        case "youtube": {
          result = await publishToYouTube(account.accessToken, input.text);
          break;
        }
        default:
          throw new TRPCError({ code: "BAD_REQUEST", message: `Publishing not yet supported for ${account.platform}` });
      }

      return { success: true, ...result };
    }),

  /** Get Pinterest boards for a connected account */
  getPinterestBoards: protectedProcedure
    .input(z.object({ socialAccountId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [account] = await db.select().from(socialAccounts)
        .where(eq(socialAccounts.id, input.socialAccountId))
        .limit(1);

      if (!account || account.platform !== "pinterest") {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (!account.accessToken) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No access token" });

      const res = await fetch("https://api.pinterest.com/v5/boards?page_size=50", {
        headers: { Authorization: `Bearer ${account.accessToken}` },
      });
      if (!res.ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch boards" });
      const data = await res.json() as any;
      return (data.items ?? []).map((b: any) => ({ id: b.id, name: b.name }));
    }),
});
