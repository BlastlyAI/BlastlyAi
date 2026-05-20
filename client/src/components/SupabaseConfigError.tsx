import { getSupabaseConfigDiagnostics } from "@/lib/supabaseEnv";

const BG = "#02020c";
const GOLD = "#d4a843";
const TEXT = "#f0ede6";
const MUTED = "#7a7a8a";

/**
 * Shown when VITE_SUPABASE_* were not inlined at build time (black screen prevention).
 */
export default function SupabaseConfigError() {
  const diag = getSupabaseConfigDiagnostics();

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: BG,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 20px",
        fontFamily: "'DM Mono', monospace",
        color: TEXT,
      }}
    >
      <p
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 28,
          fontWeight: 700,
          color: GOLD,
          letterSpacing: "0.08em",
          marginBottom: 24,
        }}
      >
        BLASTLY
      </p>
      <div
        style={{
          maxWidth: 480,
          width: "100%",
          background: "#0d0d1a",
          border: "1px solid rgba(212,168,67,0.25)",
          borderRadius: 16,
          padding: "28px 24px",
        }}
      >
        <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: TEXT }}>
          Supabase is not configured for this deployment
        </h1>
        <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.65, marginBottom: 16 }}>
          This build was created without <code style={{ color: GOLD }}>VITE_SUPABASE_URL</code> and{" "}
          <code style={{ color: GOLD }}>VITE_SUPABASE_ANON_KEY</code>. Vite bakes these into the
          bundle at <strong style={{ color: TEXT }}>build time</strong> — adding env vars in Vercel
          without redeploying will not fix an already-built app.
        </p>
        <ol style={{ fontSize: 12, color: MUTED, lineHeight: 1.8, paddingLeft: 20, marginBottom: 16 }}>
          <li>
            Vercel → Project → <strong style={{ color: TEXT }}>Settings → Environment Variables</strong>
          </li>
          <li>
            Add <code>VITE_SUPABASE_URL</code> (e.g. https://xxx.supabase.co) and{" "}
            <code>VITE_SUPABASE_ANON_KEY</code> (anon public key)
          </li>
          <li>Enable for <strong style={{ color: TEXT }}>Production</strong> and <strong style={{ color: TEXT }}>Preview</strong></li>
          <li>
            <strong style={{ color: GOLD }}>Redeploy</strong> the latest commit from the Deployments tab
          </li>
        </ol>
        <p style={{ fontSize: 11, color: MUTED, marginBottom: 8 }}>
          Build diagnostics: URL set={String(diag.hasUrl)}, key set={String(diag.hasKey)}, mode=
          {diag.mode}, prod={String(diag.prod)}
        </p>
        <a
          href="/"
          style={{
            display: "inline-block",
            marginTop: 8,
            fontSize: 12,
            color: GOLD,
            textDecoration: "none",
          }}
        >
          Reload page after redeploy →
        </a>
      </div>
    </div>
  );
}
