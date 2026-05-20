import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

async function main() {
  if (!process.env.DATABASE_URL) { console.error("No DATABASE_URL"); process.exit(1); }
  const db = drizzle(process.env.DATABASE_URL);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS \`workspace_preferences\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`workspaceId\` int NOT NULL,
    \`colorScheme\` enum('bold','soft','warm') NOT NULL DEFAULT 'bold',
    \`homeMode\` enum('dashboard','assistant') NOT NULL DEFAULT 'dashboard',
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`workspace_preferences_id\` PRIMARY KEY(\`id\`),
    CONSTRAINT \`workspace_preferences_workspaceId_unique\` UNIQUE(\`workspaceId\`)
  )`);
  console.log("Done");
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
