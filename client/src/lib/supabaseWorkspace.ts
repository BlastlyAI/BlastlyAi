import { requireSupabaseBrowserClient } from "./supabase";
import { uuidToLegacyId } from "@/types/appUser";

export type WorkspaceRow = {
  id: string;
  owner_id: string;
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
};

function mapWorkspace(row: WorkspaceRow): AppWorkspace {
  return {
    id: uuidToLegacyId(row.id),
    supabaseId: row.id,
    name: row.name,
    slug: row.slug ?? `workspace-${row.id.slice(0, 8)}`,
    ownerId: row.owner_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export async function listWorkspacesForUser(userId: string): Promise<AppWorkspace[]> {
  const supabase = requireSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as WorkspaceRow[]).map(mapWorkspace);
}

export async function createWorkspace(userId: string, name: string): Promise<AppWorkspace> {
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

  if (error) throw error;
  return mapWorkspace(data as WorkspaceRow);
}

export async function ensureDefaultWorkspace(userId: string, name = "My Workspace"): Promise<AppWorkspace[]> {
  const existing = await listWorkspacesForUser(userId);
  if (existing.length > 0) return existing;
  await createWorkspace(userId, name);
  return listWorkspacesForUser(userId);
}
