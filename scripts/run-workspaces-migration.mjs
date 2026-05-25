/**
 * Workspace migration helper — prints SQL path; run in Supabase SQL Editor.
 * Usage: node scripts/run-workspaces-migration.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sqlPath = join(root, "supabase", "migrations", "SETUP_WORKSPACES_STANDALONE.sql");

console.log("\n=== Workspaces migration ===\n");
console.log("Run this file in Supabase → SQL Editor:\n");
console.log(`  ${sqlPath}\n`);
console.log("This creates public.workspaces, backfills users, links audits, and applies RLS.\n");

try {
  readFileSync(sqlPath, "utf8");
  console.log("SQL file found and ready.\n");
} catch {
  console.error("SQL file missing:", sqlPath);
  process.exit(1);
}
