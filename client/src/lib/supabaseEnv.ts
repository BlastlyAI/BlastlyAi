/**
 * Central read of Vite-inlined env (set in Vercel **before** build — Production + Preview).
 * Values are baked into the bundle at `vite build` time via import.meta.env.
 */

export type SupabaseEnvConfig = {
  url: string;
  anonKey: string;
};

let logged = false;

function readViteEnv(name: "VITE_SUPABASE_URL" | "VITE_SUPABASE_ANON_KEY"): string {
  const raw = import.meta.env[name];
  return typeof raw === "string" ? raw.trim() : "";
}

/** One-time debug logs for production troubleshooting (remove when stable). */
export function logSupabaseEnvDiagnostics(): void {
  if (logged || typeof window === "undefined") return;
  logged = true;
  console.log("SUPABASE URL:", import.meta.env.VITE_SUPABASE_URL);
  console.log("SUPABASE KEY EXISTS:", !!import.meta.env.VITE_SUPABASE_ANON_KEY);
  console.log("[Blastly] import.meta.env.MODE:", import.meta.env.MODE);
  console.log("[Blastly] import.meta.env.PROD:", import.meta.env.PROD);
}

export function getSupabaseEnvConfig(): SupabaseEnvConfig | null {
  logSupabaseEnvDiagnostics();

  const url = readViteEnv("VITE_SUPABASE_URL");
  const anonKey = readViteEnv("VITE_SUPABASE_ANON_KEY");

  if (!url || !anonKey) return null;

  try {
    new URL(url);
  } catch {
    console.warn("[Blastly] VITE_SUPABASE_URL is not a valid URL:", url);
    return null;
  }

  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseEnvConfig() !== null;
}

export function getSupabaseConfigDiagnostics(): {
  hasUrl: boolean;
  hasKey: boolean;
  mode: string;
  prod: boolean;
} {
  return {
    hasUrl: Boolean(readViteEnv("VITE_SUPABASE_URL")),
    hasKey: Boolean(readViteEnv("VITE_SUPABASE_ANON_KEY")),
    mode: import.meta.env.MODE,
    prod: import.meta.env.PROD,
  };
}
