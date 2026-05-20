export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getPublicApiBaseUrl } from "@/lib/apiOrigin";

/** Blastly email/password login (works on localhost). */
export function getAppLoginPath(returnPath?: string): string {
  if (!returnPath) return "/login";
  return `/login?return=${encodeURIComponent(returnPath)}`;
}

// Generate login URL at runtime so redirect URI reflects the current origin.
// Pass an optional returnPath (e.g. "/onboarding") to redirect there after login.
export const getLoginUrl = (returnPath?: string) => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID ?? "";
  const redirectUri = `${getPublicApiBaseUrl()}/api/oauth/callback`;
  // Encode origin + optional returnPath so the callback can redirect correctly
  const statePayload = returnPath
    ? `${redirectUri}|${returnPath}`
    : redirectUri;
  const state = btoa(statePayload);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
