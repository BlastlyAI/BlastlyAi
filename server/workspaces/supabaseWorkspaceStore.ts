import { getSupabaseForAudit } from "../lib/supabaseAuditClient";
import { probeSupabasePublicSchema } from "../lib/supabaseSchemaProbe";
import { normalisePlanTier, type PlanTier } from "../stripe/products";

export type WorkspaceRow = {
  id: string;
  owner_id: string;
  business_name: string;
  website: string | null;
  plan_tier: string;
  name: string | null;
  slug: string | null;
  industry: string | null;
  description: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  tone_of_voice: string | null;
  target_audience: string | null;
  tagline: string | null;
  phone: string | null;
  address: string | null;
  google_review_url: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
};

export type BrandProfileInput = {
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
  logoUrl?: string | null;
};

function mapRow(row: Record<string, unknown>): WorkspaceRow {
  const businessName =
    (row.business_name as string)?.trim() ||
    (row.name as string)?.trim() ||
    "My Workspace";
  return {
    id: String(row.id),
    owner_id: String(row.owner_id),
    business_name: businessName,
    website: (row.website as string) ?? null,
    plan_tier: normalisePlanTier(row.plan_tier as string),
    name: (row.name as string) ?? businessName,
    slug: (row.slug as string) ?? null,
    industry: (row.industry as string) ?? null,
    description: (row.description as string) ?? null,
    primary_color: (row.primary_color as string) ?? "#6366f1",
    secondary_color: (row.secondary_color as string) ?? "#f59e0b",
    tone_of_voice: (row.tone_of_voice as string) ?? "professional",
    target_audience: (row.target_audience as string) ?? null,
    tagline: (row.tagline as string) ?? null,
    phone: (row.phone as string) ?? null,
    address: (row.address as string) ?? null,
    google_review_url: (row.google_review_url as string) ?? null,
    logo_url: (row.logo_url as string) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export function workspaceRowToApi(w: WorkspaceRow) {
  return {
    id: w.id,
    ownerId: w.owner_id,
    businessName: w.business_name,
    website: w.website,
    planTier: w.plan_tier,
    name: w.name ?? w.business_name,
    slug: w.slug,
    industry: w.industry,
    description: w.description,
    primaryColor: w.primary_color,
    secondaryColor: w.secondary_color,
    toneOfVoice: w.tone_of_voice,
    targetAudience: w.target_audience,
    tagline: w.tagline,
    phone: w.phone,
    address: w.address,
    googleReviewUrl: w.google_review_url,
    logoUrl: w.logo_url,
    createdAt: w.created_at,
    updatedAt: w.updated_at,
  };
}

export async function listWorkspacesForOwner(userId: string): Promise<WorkspaceRow[]> {
  const schema = await probeSupabasePublicSchema();
  if (!schema.hasWorkspaces) return [];

  const supabase = getSupabaseForAudit();
  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
}

export async function getOrCreateDefaultWorkspace(
  userId: string,
  hints?: { businessName?: string | null; website?: string | null; planTier?: PlanTier }
): Promise<WorkspaceRow> {
  const schema = await probeSupabasePublicSchema(true);
  if (!schema.hasWorkspaces) {
    throw new Error("public.workspaces table not found. Run SETUP_WORKSPACES_STANDALONE.sql");
  }

  const existing = await listWorkspacesForOwner(userId);
  if (existing.length > 0) {
    const ws = existing[0];
    const patch: Record<string, unknown> = {};
    if (hints?.businessName?.trim() && ws.business_name === "My Workspace") {
      patch.business_name = hints.businessName.trim();
      patch.name = hints.businessName.trim();
    }
    if (hints?.website?.trim() && !ws.website) {
      patch.website = hints.website.trim();
    }
    if (Object.keys(patch).length > 0) {
      patch.updated_at = new Date().toISOString();
      const supabase = getSupabaseForAudit();
      const { data, error } = await supabase
        .from("workspaces")
        .update(patch)
        .eq("id", ws.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return mapRow(data as Record<string, unknown>);
    }
    return ws;
  }

  const businessName = hints?.businessName?.trim() || "My Workspace";
  const slug =
    businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || `workspace-${Date.now()}`;

  const supabase = getSupabaseForAudit();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("workspaces")
    .insert({
      owner_id: userId,
      business_name: businessName,
      name: businessName,
      slug,
      website: hints?.website?.trim() ?? null,
      plan_tier: hints?.planTier ?? "free",
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as Record<string, unknown>);
}

/** Sync plan_tier on all workspaces owned by a user (after Stripe activation). */
export async function updateWorkspacePlanForOwner(
  userId: string,
  planTier: PlanTier
): Promise<void> {
  const schema = await probeSupabasePublicSchema();
  if (!schema.hasWorkspaces) return;

  const supabase = getSupabaseForAudit();
  const { error } = await supabase
    .from("workspaces")
    .update({ plan_tier: planTier, updated_at: new Date().toISOString() })
    .eq("owner_id", userId);

  if (error) throw new Error(error.message);
}

export async function verifyWorkspaceOwner(userId: string, workspaceId: string): Promise<boolean> {
  const schema = await probeSupabasePublicSchema();
  if (!schema.hasWorkspaces) return false;

  const supabase = getSupabaseForAudit();
  const { data, error } = await supabase
    .from("workspaces")
    .select("id")
    .eq("id", workspaceId)
    .eq("owner_id", userId)
    .maybeSingle();

  if (error) return false;
  return !!data?.id;
}

export async function getWorkspaceByIdForOwner(
  userId: string,
  workspaceId: string
): Promise<WorkspaceRow | null> {
  const owned = await verifyWorkspaceOwner(userId, workspaceId);
  if (!owned) return null;

  const supabase = getSupabaseForAudit();
  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapRow(data as Record<string, unknown>);
}

export async function createWorkspaceForOwner(
  userId: string,
  input: { name: string; website?: string; industry?: string; description?: string }
): Promise<WorkspaceRow> {
  const schema = await probeSupabasePublicSchema(true);
  if (!schema.hasWorkspaces) {
    throw new Error("public.workspaces table not found. Run SETUP_WORKSPACES_STANDALONE.sql");
  }

  const businessName = input.name.trim();
  const slug =
    businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || `workspace-${Date.now()}`;

  const supabase = getSupabaseForAudit();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("workspaces")
    .insert({
      owner_id: userId,
      business_name: businessName,
      name: businessName,
      slug,
      website: input.website?.trim() ?? null,
      industry: input.industry?.trim() ?? null,
      description: input.description?.trim() ?? null,
      plan_tier: "free",
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as Record<string, unknown>);
}

function isBrandColumnError(message: string): boolean {
  return /industry|description|tone_of_voice|primary_color|PGRST204|column.*does not exist/i.test(
    message
  );
}

export async function updateWorkspaceBrandProfile(
  userId: string,
  workspaceId: string,
  input: BrandProfileInput
): Promise<WorkspaceRow> {
  const owned = await verifyWorkspaceOwner(userId, workspaceId);
  if (!owned) throw new Error("Workspace not found");

  const now = new Date().toISOString();
  const fullPatch: Record<string, unknown> = { updated_at: now };
  if (input.name !== undefined) {
    fullPatch.business_name = input.name.trim();
    fullPatch.name = input.name.trim();
  }
  if (input.website !== undefined) fullPatch.website = input.website.trim() || null;
  if (input.industry !== undefined) fullPatch.industry = input.industry.trim() || null;
  if (input.description !== undefined) fullPatch.description = input.description.trim() || null;
  if (input.primaryColor !== undefined) fullPatch.primary_color = input.primaryColor;
  if (input.secondaryColor !== undefined) fullPatch.secondary_color = input.secondaryColor;
  if (input.toneOfVoice !== undefined) fullPatch.tone_of_voice = input.toneOfVoice;
  if (input.targetAudience !== undefined) fullPatch.target_audience = input.targetAudience.trim() || null;
  if (input.tagline !== undefined) fullPatch.tagline = input.tagline.trim() || null;
  if (input.phone !== undefined) fullPatch.phone = input.phone.trim() || null;
  if (input.address !== undefined) fullPatch.address = input.address.trim() || null;
  if (input.googleReviewUrl !== undefined) fullPatch.google_review_url = input.googleReviewUrl.trim() || null;
  if (input.logoUrl !== undefined) fullPatch.logo_url = input.logoUrl;

  const basePatch: Record<string, unknown> = { updated_at: now };
  if (input.name !== undefined) {
    basePatch.business_name = input.name.trim();
    basePatch.name = input.name.trim();
  }
  if (input.website !== undefined) basePatch.website = input.website.trim() || null;

  const supabase = getSupabaseForAudit();

  for (const patch of [fullPatch, basePatch]) {
    const { data, error } = await supabase
      .from("workspaces")
      .update(patch)
      .eq("id", workspaceId)
      .select("*")
      .single();

    if (!error) return mapRow(data as Record<string, unknown>);

    if (isBrandColumnError(error.message) && patch === fullPatch) {
      continue;
    }
    throw new Error(
      isBrandColumnError(error.message)
        ? "Brand profile columns missing on public.workspaces. Run supabase/migrations/SETUP_WORKSPACE_BRAND_PROFILE.sql"
        : error.message
    );
  }

  throw new Error("Failed to update brand profile");
}
