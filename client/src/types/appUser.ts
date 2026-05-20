/** App user derived from Supabase Auth + public.users profile. */
export type AppUser = {
  /** Supabase auth user id (uuid). */
  id: string;
  email: string;
  name: string;
  businessName: string | null;
  industry: string | null;
  welcomeCompleted: boolean;
  role: "user" | "admin";
  createdAt: string;
};

/** Stable positive int for legacy dashboard code that expected numeric workspace ids. */
export function uuidToLegacyId(uuid: string): number {
  let h = 0;
  for (let i = 0; i < uuid.length; i++) {
    h = (Math.imul(31, h) + uuid.charCodeAt(i)) | 0;
  }
  const n = Math.abs(h);
  return n === 0 ? 1 : n;
}
