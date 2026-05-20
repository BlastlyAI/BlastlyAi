/**
 * Social Platform OAuth Routes
 * Handles OAuth 2.0 flows for LinkedIn, YouTube (Google), and Pinterest.
 * Bluesky uses app-password flow (handled via tRPC in social router).
 */
import { Express, Request, Response } from "express";
import crypto from "crypto";
import { sdk } from "./_core/sdk";
import { upsertSocialAccount } from "./db";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getEnv(key: string): string {
  return process.env[key] ?? "";
}

/** Build a secure random state token and encode workspace + user info */
function buildState(userId: number, workspaceId: number, platform: string): string {
  const nonce = crypto.randomBytes(16).toString("hex");
  const payload = Buffer.from(JSON.stringify({ userId, workspaceId, platform, nonce })).toString("base64url");
  return payload;
}

function parseState(state: string): { userId: number; workspaceId: number; platform: string } | null {
  try {
    return JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function getBaseUrl(req: Request): string {
  // Use the origin from the referer/origin header, falling back to the request host
  const origin = req.headers.origin ?? req.headers.referer?.replace(/\/$/, "");
  if (origin) return origin;
  const proto = req.headers["x-forwarded-proto"] ?? "https";
  return `${proto}://${req.headers.host}`;
}

// ─── LinkedIn OAuth ────────────────────────────────────────────────────────────

async function linkedinConnect(req: Request, res: Response) {
  const clientId = getEnv("LINKEDIN_CLIENT_ID");
  if (!clientId) return res.status(503).json({ error: "LinkedIn not configured — add LINKEDIN_CLIENT_ID" });

  let user: any;
  try { user = await sdk.authenticateRequest(req as any); } catch { return res.status(401).json({ error: "Not authenticated" }); }

  const workspaceId = parseInt(req.query.workspaceId as string || "0");
  const state = buildState(user.id, workspaceId, "linkedin");
  const redirectUri = `${getBaseUrl(req)}/api/auth/linkedin/callback`;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: "openid profile email w_member_social",
  });

  res.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`);
}

async function linkedinCallback(req: Request, res: Response) {
  const { code, state, error } = req.query as Record<string, string>;
  if (error) return res.redirect(`/connections?error=${encodeURIComponent(error)}`);

  const stateData = parseState(state);
  if (!stateData) return res.redirect("/connections?error=invalid_state");

  const clientId = getEnv("LINKEDIN_CLIENT_ID");
  const clientSecret = getEnv("LINKEDIN_CLIENT_SECRET");
  const redirectUri = `${getBaseUrl(req)}/api/auth/linkedin/callback`;

  try {
    // Exchange code for token
    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    const tokenData = await tokenRes.json() as any;
    if (!tokenData.access_token) throw new Error(tokenData.error_description ?? "Token exchange failed");

    // Fetch profile
    const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json() as any;

    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : undefined;

    await upsertSocialAccount({
      workspaceId: stateData.workspaceId,
      userId: stateData.userId,
      platform: "linkedin",
      platformAccountId: profile.sub ?? profile.id ?? "unknown",
      platformUsername: profile.email ?? profile.name ?? "linkedin-user",
      platformDisplayName: profile.name ?? undefined,
      platformAvatarUrl: profile.picture ?? undefined,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? undefined,
      tokenExpiresAt: expiresAt,
      scopes: "openid profile email w_member_social",
    });

    res.redirect("/connections?connected=linkedin");
  } catch (err: any) {
    console.error("[LinkedIn OAuth]", err);
    res.redirect(`/connections?error=${encodeURIComponent(err.message ?? "oauth_failed")}`);
  }
}

// ─── YouTube / Google OAuth ────────────────────────────────────────────────────

async function youtubeConnect(req: Request, res: Response) {
  const clientId = getEnv("GOOGLE_CLIENT_ID");
  if (!clientId) return res.status(503).json({ error: "YouTube not configured — add GOOGLE_CLIENT_ID" });

  let user: any;
  try { user = await sdk.authenticateRequest(req as any); } catch { return res.status(401).json({ error: "Not authenticated" }); }

  const workspaceId = parseInt(req.query.workspaceId as string || "0");
  const state = buildState(user.id, workspaceId, "youtube");
  const redirectUri = `${getBaseUrl(req)}/api/auth/youtube/callback`;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email",
    access_type: "offline",
    prompt: "consent",
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}

async function youtubeCallback(req: Request, res: Response) {
  const { code, state, error } = req.query as Record<string, string>;
  if (error) return res.redirect(`/connections?error=${encodeURIComponent(error)}`);

  const stateData = parseState(state);
  if (!stateData) return res.redirect("/connections?error=invalid_state");

  const clientId = getEnv("GOOGLE_CLIENT_ID");
  const clientSecret = getEnv("GOOGLE_CLIENT_SECRET");
  const redirectUri = `${getBaseUrl(req)}/api/auth/youtube/callback`;

  try {
    // Exchange code for token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    const tokenData = await tokenRes.json() as any;
    if (!tokenData.access_token) throw new Error(tokenData.error_description ?? "Token exchange failed");

    // Fetch Google profile
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json() as any;

    // Fetch YouTube channel info
    const channelRes = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );
    const channelData = await channelRes.json() as any;
    const channel = channelData.items?.[0];

    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : undefined;

    await upsertSocialAccount({
      workspaceId: stateData.workspaceId,
      userId: stateData.userId,
      platform: "youtube",
      platformAccountId: channel?.id ?? profile.id ?? "unknown",
      platformUsername: channel?.snippet?.customUrl ?? profile.email ?? "youtube-user",
      platformDisplayName: channel?.snippet?.title ?? profile.name ?? undefined,
      platformAvatarUrl: channel?.snippet?.thumbnails?.default?.url ?? profile.picture ?? undefined,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? undefined,
      tokenExpiresAt: expiresAt,
      scopes: "youtube.upload youtube.readonly",
    });

    res.redirect("/connections?connected=youtube");
  } catch (err: any) {
    console.error("[YouTube OAuth]", err);
    res.redirect(`/connections?error=${encodeURIComponent(err.message ?? "oauth_failed")}`);
  }
}

// ─── Pinterest OAuth ───────────────────────────────────────────────────────────

async function pinterestConnect(req: Request, res: Response) {
  const clientId = getEnv("PINTEREST_APP_ID");
  if (!clientId) return res.status(503).json({ error: "Pinterest not configured — add PINTEREST_APP_ID" });

  let user: any;
  try { user = await sdk.authenticateRequest(req as any); } catch { return res.status(401).json({ error: "Not authenticated" }); }

  const workspaceId = parseInt(req.query.workspaceId as string || "0");
  const state = buildState(user.id, workspaceId, "pinterest");
  const redirectUri = `${getBaseUrl(req)}/api/auth/pinterest/callback`;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: "boards:read,pins:read,pins:write,user_accounts:read",
  });

  res.redirect(`https://www.pinterest.com/oauth/?${params}`);
}

async function pinterestCallback(req: Request, res: Response) {
  const { code, state, error } = req.query as Record<string, string>;
  if (error) return res.redirect(`/connections?error=${encodeURIComponent(error)}`);

  const stateData = parseState(state);
  if (!stateData) return res.redirect("/connections?error=invalid_state");

  const clientId = getEnv("PINTEREST_APP_ID");
  const clientSecret = getEnv("PINTEREST_APP_SECRET");
  const redirectUri = `${getBaseUrl(req)}/api/auth/pinterest/callback`;

  try {
    // Exchange code for token
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const tokenRes = await fetch("https://api.pinterest.com/v5/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });
    const tokenData = await tokenRes.json() as any;
    if (!tokenData.access_token) throw new Error(tokenData.message ?? "Token exchange failed");

    // Fetch Pinterest profile
    const profileRes = await fetch("https://api.pinterest.com/v5/user_account", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json() as any;

    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : undefined;

    await upsertSocialAccount({
      workspaceId: stateData.workspaceId,
      userId: stateData.userId,
      platform: "pinterest",
      platformAccountId: profile.id ?? "unknown",
      platformUsername: profile.username ?? "pinterest-user",
      platformDisplayName: profile.business_name ?? profile.username ?? undefined,
      platformAvatarUrl: profile.profile_image ?? undefined,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? undefined,
      tokenExpiresAt: expiresAt,
      scopes: "boards:read,pins:read,pins:write,user_accounts:read",
    });

    res.redirect("/connections?connected=pinterest");
  } catch (err: any) {
    console.error("[Pinterest OAuth]", err);
    res.redirect(`/connections?error=${encodeURIComponent(err.message ?? "oauth_failed")}`);
  }
}

// ─── Register all routes ───────────────────────────────────────────────────────

export function registerSocialOAuthRoutes(app: Express) {
  app.get("/api/auth/linkedin/connect", linkedinConnect);
  app.get("/api/auth/linkedin/callback", linkedinCallback);
  app.get("/api/auth/youtube/connect", youtubeConnect);
  app.get("/api/auth/youtube/callback", youtubeCallback);
  app.get("/api/auth/pinterest/connect", pinterestConnect);
  app.get("/api/auth/pinterest/callback", pinterestCallback);
}
