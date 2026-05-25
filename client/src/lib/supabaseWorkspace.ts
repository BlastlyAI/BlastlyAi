import { requireSupabaseBrowserClient } from "./supabase";
import {
  isSupabaseSchemaMismatch,
  isSupabaseSchemaMinimal,
  markSupabaseSchemaMinimal,
} from "./supabaseSchema";
import { uuidToLegacyId } from "@/types/appUser";

export type WorkspaceRow = {
  id: string;
  owner_id: string;
  business_name?: string | null;
  website?: string | null;
  plan_tier?: string | null;
  name: string;
  slug: string | null;
  created_at: string;
  updated_at: string;
};

/** Workspace shape consumed by existing UI (numeric id is a stable hash of uuid). */
export type AppWorkspace = {
  id: number;
  supabaseId: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  businessName?: string;
  website?: string | null;
  planTier?: string | null;
};

function mapWorkspace(row: WorkspaceRow): AppWorkspace {
  const businessName = row.business_name?.trim() || row.name?.trim() || "My Workspace";
  return {
    id: uuidToLegacyId(row.id),
    supabaseId: row.id,
    name: businessName,
    slug: row.slug ?? `workspace-${row.id.slice(0, 8)}`,
    ownerId: row.owner_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    businessName,
    website: row.website ?? null,
    planTier: row.plan_tier ?? "free",
  };
}

/** In-memory workspace when `public.workspaces` table is not migrated yet. */
export function fallbackWorkspace(userId: string, name = "My Workspace"): AppWorkspace {
  return {
    id: uuidToLegacyId(userId),
    supabaseId: userId,
    name,
    slug: "my-workspace",
    ownerId: userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function listWorkspacesForUser(userId: string): Promise<AppWorkspace[]> {
  if (isSupabaseSchemaMinimal()) return [];

  const supabase = requireSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    if (isSupabaseSchemaMismatch(error)) {
      markSupabaseSchemaMinimal(error);
      return [];
    }
    throw error;
  }
  return (data as WorkspaceRow[]).map(mapWorkspace);
}

export async function createWorkspace(userId: string, name: string): Promise<AppWorkspace> {
  if (isSupabaseSchemaMinimal()) {
    return fallbackWorkspace(userId, name);
  }

  const supabase = requireSupabaseBrowserClient();
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || `workspace-${Date.now()}`;

  const { data, error } = await supabase
    .from("workspaces")
    .insert({ owner_id: userId, name, slug })
    .select("*")
    .single();

  if (error) {
    if (isSupabaseSchemaMismatch(error)) {
      markSupabaseSchemaMinimal(error);
      return fallbackWorkspace(userId, name);
    }
    throw error;
  }
  return mapWorkspace(data as WorkspaceRow);
}

export async function ensureDefaultWorkspace(
  userId: string,
  name = "My Workspace"
): Promise<AppWorkspace[]> {
  if (isSupabaseSchemaMinimal()) {
    return [fallbackWorkspace(userId, name)];
  }

  const existing = await listWorkspacesForUser(userId);
  if (existing.length > 0) return existing;

  if (isSupabaseSchemaMinimal()) {
    return [fallbackWorkspace(userId, name)];
  }

  try {
    await createWorkspace(userId, name);
    const created = await listWorkspacesForUser(userId);
    if (created.length > 0) return created;
  } catch (e) {
    if (!isSupabaseSchemaMismatch(e as { code?: string; message?: string })) {
      throw e;
    }
    markSupabaseSchemaMinimal(e as { code?: string; message?: string });
  }

  return [fallbackWorkspace(userId, name)];
}
