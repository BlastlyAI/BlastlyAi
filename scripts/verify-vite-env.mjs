/**
 * Ensures VITE_SUPABASE_* are present when building on Vercel.
 * Vite inlines these at build time — runtime-only env vars will NOT work.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadDotEnv() {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadDotEnv();

const url = process.env.VITE_SUPABASE_URL?.trim() ?? "";
const key = process.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";
const onVercel = process.env.VERCEL === "1";

if (!url || !key) {
  const msg = [
    "[verify-vite-env] Missing VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY.",
    "Vite embeds these at BUILD time. On Vercel: Settings → Environment Variables,",
    "add both for Production + Preview, then redeploy.",
    `  VITE_SUPABASE_URL: ${url ? "set" : "MISSING"}`,
    `  VITE_SUPABASE_ANON_KEY: ${key ? "set" : "MISSING"}`,
  ].join("\n");

  if (onVercel) {
    console.error(msg);
    process.exit(1);
  }
  console.warn(msg + "\n(Local build will continue; production UI will show config error.)");
} else {
  console.log("[verify-vite-env] OK — Supabase env vars present for Vite build.");
}
