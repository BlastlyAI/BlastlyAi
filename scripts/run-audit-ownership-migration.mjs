/**
 * Probe Supabase schema and apply audit ownership migration when SUPABASE_DB_URL is set.
 *
 * Usage:
 *   SUPABASE_DB_URL="postgresql://postgres.[ref]:[password]@...pooler.supabase.com:6543/postgres" \
 *     node scripts/run-audit-ownership-migration.mjs
 *
 * Get the connection string from Supabase Dashboard → Project Settings → Database.
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
  }
}

loadEnvFile();

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

async function probeTables() {
  if (!url || !serviceKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  async function exists(table) {
    const { error } = await supabase.from(table).select("id").limit(1);
    if (!error) return true;
    if (/PGRST205|schema cache|does not exist/i.test(error.message)) return false;
    if (/permission denied|42501/i.test(error.message)) return true;
    console.warn(`  ${table}: ${error.message}`);
    return false;
  }

  const hasUsers = await exists("users");
  const hasWorkspaces = await exists("workspaces");
  const hasAuditReports = await exists("audit_reports");
  const hasOrganizations = await exists("organizations");
  const hasTeams = await exists("teams");

  console.log("\n=== Supabase public schema probe ===");
  console.log({
    hasUsers,
    hasWorkspaces,
    hasAuditReports,
    hasOrganizations,
    hasTeams,
  });

  let hasCreatedBy = false;
  if (hasAuditReports) {
    const { error } = await supabase.from("audit_reports").select("created_by").limit(1);
    hasCreatedBy = !error || !/created_by|column.*does not exist/i.test(error.message);
    console.log("audit_reports.created_by:", hasCreatedBy ? "present" : "missing");
  }

  return { hasAuditReports, hasCreatedBy };
}

async function runMigrationSql() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.log("\nSUPABASE_DB_URL not set — cannot run DDL automatically.");
    console.log("Copy supabase/migrations/00000000000005_audit_ownership.sql into Supabase SQL Editor and Run.");
    return false;
  }

  let pg;
  try {
    pg = await import("pg");
  } catch {
    console.log("\nInstall pg to run migrations directly: pnpm add -D pg");
    return false;
  }

  const sqlPath = join(root, "supabase/migrations/00000000000005_audit_ownership.sql");
  const sql = readFileSync(sqlPath, "utf8");
  const client = new pg.default.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

  console.log("\n=== Applying migration via postgres ===");
  await client.connect();
  try {
    await client.query(sql);
    console.log("Migration applied successfully.");
    return true;
  } finally {
    await client.end();
  }
}

const { hasAuditReports, hasCreatedBy } = await probeTables();

if (!hasAuditReports) {
  console.error("\naudit_reports table missing. Run SETUP_AUDIT_STANDALONE.sql first.");
  process.exit(1);
}

if (hasCreatedBy) {
  console.log("\nOwnership migration already applied (created_by column exists).");
  process.exit(0);
}

const applied = await runMigrationSql();
process.exit(applied ? 0 : 1);
