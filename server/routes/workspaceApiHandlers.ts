import type { AuditAuthContext } from "../lib/auditAuthRequest";
import {
  createWorkspaceForOwner,
  getOrCreateDefaultWorkspace,
  listWorkspacesForOwner,
  updateWorkspaceBrandProfile,
  workspaceRowToApi,
  type BrandProfileInput,
} from "../workspaces/supabaseWorkspaceStore";
import { ensurePublicUser } from "../users/publicUserStore";

export async function handleWorkspaceList(auth: AuditAuthContext) {
  if (!auth.userId) throw new Error("Authentication required");
  await ensurePublicUser({ id: auth.userId });
  const rows = await listWorkspacesForOwner(auth.userId);
  return rows.map(workspaceRowToApi);
}

export async function handleWorkspaceEnsureDefault(
  auth: AuditAuthContext,
  body: { businessName?: string; website?: string }
) {
  if (!auth.userId) throw new Error("Authentication required");
  await ensurePublicUser({ id: auth.userId });
  const ws = await getOrCreateDefaultWorkspace(auth.userId, {
    businessName: body.businessName ?? null,
    website: body.website ?? null,
  });
  return workspaceRowToApi(ws);
}

export async function handleWorkspaceCreate(
  auth: AuditAuthContext,
  body: { name: string; website?: string; industry?: string; description?: string }
) {
  if (!auth.userId) throw new Error("Authentication required");
  if (!body.name?.trim()) throw new Error("Brand name is required");
  await ensurePublicUser({ id: auth.userId });
  const ws = await createWorkspaceForOwner(auth.userId, {
    name: body.name.trim(),
    website: body.website,
    industry: body.industry,
    description: body.description,
  });
  return workspaceRowToApi(ws);
}

export async function handleWorkspaceUpdateBrandProfile(
  auth: AuditAuthContext,
  workspaceId: string,
  body: BrandProfileInput & { logoBase64?: string; logoFileName?: string }
) {
  if (!auth.userId) throw new Error("Authentication required");
  if (!workspaceId?.trim()) throw new Error("workspaceId is required");

  let logoUrl: string | null | undefined;
  if (body.logoBase64 && body.logoFileName) {
    const ext = body.logoFileName.split(".").pop()?.toLowerCase() ?? "png";
    const mime =
      ext === "svg" ? "image/svg+xml" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;
    logoUrl = `data:${mime};base64,${body.logoBase64}`;
  }

  const ws = await updateWorkspaceBrandProfile(auth.userId, workspaceId.trim(), {
    name: body.name,
    website: body.website,
    industry: body.industry,
    description: body.description,
    primaryColor: body.primaryColor,
    secondaryColor: body.secondaryColor,
    toneOfVoice: body.toneOfVoice,
    targetAudience: body.targetAudience,
    tagline: body.tagline,
    phone: body.phone,
    address: body.address,
    googleReviewUrl: body.googleReviewUrl,
    logoUrl,
  });

  return workspaceRowToApi(ws);
}
