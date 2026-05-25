/**
 * Probe billing columns and apply migration when SUPABASE_DB_URL is set.
 * Usage: node scripts/run-billing-migration.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

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

async function probe() {
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await supabase.from("users").select("assistant_name, plan_tier").limit(1);
  const missing = error && /assistant_name|plan_tier|PGRST204|schema cache/i.test(error.message);

  console.log("\n=== Billing schema probe ===");
  if (!error) {
    console.log("assistant_name + plan_tier: OK");
    return true;
  }
  console.log("Status:", missing ? "MISSING COLUMNS" : error.message);
  return false;
}

async function runSql() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.log("\nSUPABASE_DB_URL not set.");
    console.log("→ Open Supabase SQL Editor and run:");
    console.log("  supabase/migrations/SETUP_BILLING_STANDALONE.sql");
    return false;
  }

  let pg;
  try {
    pg = await import("pg");
  } catch {
    console.log("\nInstall pg: pnpm add -D pg");
    return false;
  }

  const sqlPath = join(root, "supabase/migrations/SETUP_BILLING_STANDALONE.sql");
  const sql = readFileSync(sqlPath, "utf8");
  const client = new pg.default.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(sql);
    console.log("\nBilling migration applied.");
    return true;
  } finally {
    await client.end();
  }
}

if (!url || !serviceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const ok = await probe();
if (ok) {
  console.log("\nNothing to do.");
  process.exit(0);
}

const applied = await runSql();
if (applied) {
  const okAfter = await probe();
  process.exit(okAfter ? 0 : 1);
}
process.exit(1);
