/**
 * Universal App Webhook Handler
 *
 * POST /api/webhooks/app-events
 * Header: X-Blastly-Key: <webhookSecret>
 * Body:   { event: string, [key: string]: any }
 *
 * Any connected Manus app (Genius Jungle, Coach Nova, etc.) can POST here
 * when something worth marketing happens. Blastly will:
 *   1. Authenticate the request via the secret key
 *   2. Look up the workspace for that app
 *   3. Log the event
 *   4. Generate AI social posts based on the event + brand profile
 *   5. Save them as drafts for review
 */

import type { Request, Response } from "express";
import {
  createWebhookEvent,
  getConnectedAppBySecret,
  getWorkspaceById,
  touchConnectedApp,
  updateWebhookEvent,
  createPost,
} from "./db";
import { invokeLLM } from "./_core/llm";

// ── Event type → human-readable context ──────────────────────────────────────
const EVENT_CONTEXTS: Record<string, string> = {
  course_completed:     "A student just completed a course",
  new_signup:           "A new user just signed up",
  milestone_reached:    "A user reached a milestone",
  purchase_made:        "A customer just made a purchase",
  review_received:      "A new review or testimonial was received",
  feature_launched:     "A new feature or product was launched",
  user_achievement:     "A user unlocked an achievement",
  subscription_started: "A new subscription was started",
};

export async function handleAppWebhook(req: Request, res: Response) {
  // ── 1. Authenticate ──────────────────────────────────────────────────────
  const secret = req.headers["x-blastly-key"] as string | undefined;
  if (!secret) {
    return res.status(401).json({ error: "Missing X-Blastly-Key header" });
  }

  const app = await getConnectedAppBySecret(secret);
  if (!app || !app.isActive) {
    return res.status(401).json({ error: "Invalid or inactive webhook key" });
  }

  // ── 2. Parse body ────────────────────────────────────────────────────────
  const body = req.body as Record<string, unknown>;
  const eventType = (body.event as string) || "unknown";

  // ── 3. Log the event ─────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let eventInsertId: number | null = null;
  try {
    const result = await createWebhookEvent({
      connectedAppId: app.id,
      workspaceId: app.workspaceId,
      eventType,
      payload: body,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    eventInsertId = (result as any)?.[0]?.insertId ?? null;
    await touchConnectedApp(app.id);
  } catch (err) {
    console.error("[Webhook] Failed to log event:", err);
    return res.status(500).json({ error: "Failed to log event" });
  }

  // ── 4. Acknowledge immediately (process async) ───────────────────────────
  res.json({ received: true, eventId: eventInsertId });

  // ── 5. Generate AI posts (async, after response sent) ────────────────────
  void (async () => {
    try {
      const workspace = await getWorkspaceById(app.workspaceId);
      if (!workspace) throw new Error("Workspace not found");

      const eventContext = EVENT_CONTEXTS[eventType] ?? `Event: ${eventType}`;
      const brandContext = [
        workspace.name && `Brand: ${workspace.name}`,
        workspace.industry && `Industry: ${workspace.industry}`,
        workspace.toneOfVoice && `Tone: ${workspace.toneOfVoice}`,
        workspace.targetAudience && `Audience: ${workspace.targetAudience}`,
        workspace.description && `About: ${workspace.description}`,
      ].filter(Boolean).join("\n");

      const payloadSummary = Object.entries(body)
        .filter(([k]) => k !== "event")
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");

      const prompt = `You are a social media manager for ${workspace.name}.

${brandContext}

Something just happened in our app "${app.appName}": ${eventContext}.
Event details: ${payloadSummary || "No additional details"}

Write 3 short social media posts to celebrate or announce this. Each post should:
- Be authentic and on-brand
- Include 2-3 relevant hashtags
- Be suitable for LinkedIn, Instagram, and X/Twitter
- Be under 280 characters each

Return JSON: { "posts": [{ "platform": "linkedin|instagram|twitter", "text": "...", "hashtags": ["..."] }] }`;

      const llmResponse = await invokeLLM({
        messages: [
          { role: "system", content: "You are a social media expert. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "social_posts",
            strict: true,
            schema: {
              type: "object",
              properties: {
                posts: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      platform: { type: "string" },
                      text: { type: "string" },
                      hashtags: { type: "array", items: { type: "string" } },
                    },
                    required: ["platform", "text", "hashtags"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["posts"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = llmResponse?.choices?.[0]?.message?.content;
      const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
      const generatedPostIds: number[] = [];

      for (const p of (parsed.posts ?? []) as Array<{ platform: string; text: string; hashtags: string[] }>) {
        const postText = `${p.text}\n\n${p.hashtags.map((h) => `#${h.replace(/^#/, "")}`).join(" ")}`;
        const result = await createPost({
          workspaceId: app.workspaceId,
          bodyText: postText,
          hashtags: p.hashtags,
          status: "draft",
          createdByUserId: 0, // system-generated
          title: `[${app.appName}] ${eventContext}`,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pid = (result as any)?.[0]?.insertId;
        if (pid) generatedPostIds.push(pid);
      }

      if (eventInsertId) {
        await updateWebhookEvent(eventInsertId, { status: "done", generatedPostIds });
      }
      console.log(`[Webhook] Generated ${generatedPostIds.length} posts for "${eventType}" from ${app.appName}`);
    } catch (err) {
      console.error("[Webhook] Post generation failed:", err);
      if (eventInsertId) {
        await updateWebhookEvent(eventInsertId, {
          status: "error",
          errorMessage: err instanceof Error ? err.message : String(err),
        });
      }
    }
  })();
}
