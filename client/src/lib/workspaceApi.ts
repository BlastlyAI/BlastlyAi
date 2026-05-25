import { apiUrl } from "@/lib/apiOrigin";
import { supabaseGetSession } from "@/lib/supabaseAuth";
import { uuidToLegacyId } from "@/types/appUser";
import type { AppWorkspace } from "@/lib/supabaseWorkspace";

export type WorkspaceApiRow = {
  id: string;
  ownerId: string;
  businessName: string;
  website: string | null;
  planTier: string;
  name: string;
  slug: string | null;
  industry?: string | null;
  description?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  toneOfVoice?: string | null;
  targetAudience?: string | null;
  tagline?: string | null;
  phone?: string | null;
  address?: string | null;
  googleReviewUrl?: string | null;
  logoUrl?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BrandProfileSaveInput = {
  workspaceId: string;
  name?: string;
  website?: string;
  industry?: string;
  description?: string;
  primaryColor?: string;
  secondaryColor?: string;
  toneOfVoice?: string;
  targetAudience?: string;
  tagline?: string;
  phone?: string;
  address?: string;
  googleReviewUrl?: string;
  logoBase64?: string;
  logoFileName?: string;
};

async function authHeaders(): Promise<HeadersInit> {
  const session = await supabaseGetSession();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  return headers;
}

export function mapWorkspaceApiRow(row: WorkspaceApiRow): AppWorkspace & {
  industry?: string | null;
  description?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  toneOfVoice?: string | null;
  targetAudience?: string | null;
  tagline?: string | null;
  phone?: string | null;
  address?: string | null;
  googleReviewUrl?: string | null;
  logoUrl?: string | null;
} {
  return {
    id: uuidToLegacyId(row.id),
    supabaseId: row.id,
    name: row.businessName || row.name,
    slug: row.slug ?? `workspace-${row.id.slice(0, 8)}`,
    ownerId: row.ownerId,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    businessName: row.businessName,
    website: row.website,
    planTier: row.planTier,
    industry: row.industry ?? null,
    description: row.description ?? null,
    primaryColor: row.primaryColor ?? "#6366f1",
    secondaryColor: row.secondaryColor ?? "#f59e0b",
    toneOfVoice: row.toneOfVoice ?? "professional",
    targetAudience: row.targetAudience ?? null,
    tagline: row.tagline ?? null,
    phone: row.phone ?? null,
    address: row.address ?? null,
    googleReviewUrl: row.googleReviewUrl ?? null,
    logoUrl: row.logoUrl ?? null,
  };
}

/** Server-side ensure default workspace (service role). */
export async function ensureDefaultWorkspaceApi(input?: {
  businessName?: string;
  website?: string;
}): Promise<ReturnType<typeof mapWorkspaceApiRow> | null> {
  const session = await supabaseGetSession();
  if (!session?.access_token) return null;

  const res = await fetch(apiUrl("/api/workspaces/ensure-default"), {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({
      businessName: input?.businessName,
      website: input?.website,
    }),
  });

  if (!res.ok) {
    console.warn("[workspaces/ensure-default]", res.statusText);
    return null;
  }

  const data = (await res.json()) as { workspace: WorkspaceApiRow };
  return mapWorkspaceApiRow(data.workspace);
}

export async function listWorkspacesApi(): Promise<ReturnType<typeof mapWorkspaceApiRow>[]> {
  const session = await supabaseGetSession();
  if (!session?.access_token) return [];

  const res = await fetch(apiUrl("/api/workspaces"), { headers: await authHeaders() });
  if (!res.ok) return [];

  const data = (await res.json()) as { workspaces: WorkspaceApiRow[] };
  return (data.workspaces ?? []).map(mapWorkspaceApiRow);
}

export async function createWorkspaceApi(input: {
  name: string;
  website?: string;
  industry?: string;
  description?: string;
}): Promise<ReturnType<typeof mapWorkspaceApiRow>> {
  const res = await fetch(apiUrl("/api/workspaces"), {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  const data = (await res.json()) as { workspace?: WorkspaceApiRow; error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? res.statusText);
  }
  if (!data.workspace) throw new Error("No workspace returned");
  return mapWorkspaceApiRow(data.workspace);
}

export async function saveBrandProfileApi(
  input: BrandProfileSaveInput
): Promise<ReturnType<typeof mapWorkspaceApiRow>> {
  const { workspaceId, ...body } = input;
  const res = await fetch(apiUrl(`/api/workspaces/${encodeURIComponent(workspaceId)}/brand-profile`), {
    method: "PATCH",
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { workspace?: WorkspaceApiRow; error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? res.statusText);
  }
  if (!data.workspace) throw new Error("No workspace returned");
  return mapWorkspaceApiRow(data.workspace);
}
