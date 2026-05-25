import { apiUrl } from "@/lib/apiOrigin";
import { supabaseGetSession } from "@/lib/supabaseAuth";
import { setSupabaseSchemaMode } from "@/lib/supabaseSchema";

async function authHeaders(): Promise<HeadersInit> {
  const session = await supabaseGetSession();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  return headers;
}

/** Server-side sync auth.users → public.users (service role). Call after login/signup. */
export async function syncPublicUserApi(input?: {
  email?: string | null;
  displayName?: string | null;
  businessName?: string | null;
  website?: string | null;
}): Promise<{ synced: boolean; userId: string; workspaceId?: string | null }> {
  const session = await supabaseGetSession();
  if (!session?.access_token) {
    return { synced: false, userId: "" };
  }

  const res = await fetch(apiUrl("/api/users/sync"), {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({
      email: input?.email ?? session.user.email ?? null,
      displayName:
        input?.displayName ??
        (typeof session.user.user_metadata?.full_name === "string"
          ? session.user.user_metadata.full_name
          : null),
      businessName: input?.businessName ?? null,
      website: input?.website ?? null,
    }),
  });

  const data = (await res.json()) as { synced?: boolean; userId?: string; error?: string };
  if (!res.ok) {
    console.warn("[users/sync]", data.error ?? res.statusText);
    return { synced: false, userId: session.user.id };
  }

  setSupabaseSchemaMode("full");
  return { synced: Boolean(data.synced), userId: data.userId ?? session.user.id };
}
