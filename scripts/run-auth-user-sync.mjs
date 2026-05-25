/**
 * Apply auth → public.users sync (SQL instructions + service-role backfill).
 * Usage: node scripts/run-auth-user-sync.mjs
 *
 * 1. Run supabase/migrations/SETUP_AUTH_USER_SYNC.sql in Supabase SQL Editor (trigger + RLS + backfill)
 * 2. This script backfills any remaining auth users via Admin API
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const sqlPath = join(root, "supabase", "migrations", "SETUP_AUTH_USER_SYNC.sql");

function loadEnvFile() {
  try {
    const raw = readFileSync(join(root, ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* no .env */
  }
}

loadEnvFile();

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

console.log("\n=== Auth user sync ===\n");
console.log("Step 1: Run this SQL in Supabase → SQL Editor:");
console.log(`  ${sqlPath}\n`);

if (!url || !serviceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — cannot backfill via API.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function ensureUser(u) {
  const displayName =
    (typeof u.user_metadata?.full_name === "string" ? u.user_metadata.full_name : null) ??
    u.email?.split("@")[0] ??
    null;

  const { data: existing } = await supabase.from("users").select("id").eq("id", u.id).maybeSingle();
  const now = new Date().toISOString();

  if (existing) {
    const { error } = await supabase
      .from("users")
      .update({ email: u.email ?? null, updated_at: now })
      .eq("id", u.id);
    if (error) throw error;
    return "updated";
  }

  const { error } = await supabase.from("users").insert({
    id: u.id,
    email: u.email ?? null,
    display_name: displayName,
    plan_tier: "free",
    subscription_status: "none",
    created_at: u.created_at ?? now,
    updated_at: now,
  });
  if (error) throw error;
  return "inserted";
}

console.log("Step 2: Backfilling auth.users → public.users via service role...\n");

const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
if (error) {
  console.error("listUsers failed:", error.message);
  process.exit(1);
}

let inserted = 0;
let updated = 0;
for (const u of data.users) {
  const result = await ensureUser(u);
  if (result === "inserted") inserted++;
  else updated++;
  console.log(`${result}: ${u.email ?? u.id}`);
}

console.log(`\nDone. inserted=${inserted} updated=${updated} total=${data.users.length}`);
console.log("\nAfter SQL + backfill, refresh Table Editor → public.users should match auth.users IDs.\n");
