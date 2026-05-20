/**
 * Migration: Extend platform enum to include youtube, pinterest, bluesky
 * Run: node scripts/migrate-platform-enum.mjs
 */
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const conn = await mysql.createConnection(DATABASE_URL);

const migrations = [
  `ALTER TABLE \`analytics\` MODIFY COLUMN \`platform\` enum('twitter','linkedin','facebook','instagram','tiktok','reddit','youtube','pinterest','bluesky') NOT NULL`,
  `ALTER TABLE \`competitorMonitors\` MODIFY COLUMN \`platform\` enum('twitter','linkedin','facebook','instagram','tiktok','reddit','youtube','pinterest','bluesky') NOT NULL`,
  `ALTER TABLE \`postPlatforms\` MODIFY COLUMN \`platform\` enum('twitter','linkedin','facebook','instagram','tiktok','reddit','youtube','pinterest','bluesky') NOT NULL`,
  `ALTER TABLE \`socialAccounts\` MODIFY COLUMN \`platform\` enum('twitter','linkedin','facebook','instagram','tiktok','reddit','youtube','pinterest','bluesky') NOT NULL`,
  `ALTER TABLE \`viralityScores\` MODIFY COLUMN \`platform\` enum('twitter','linkedin','facebook','instagram','tiktok','reddit','youtube','pinterest','bluesky') NOT NULL`,
];

for (const sql of migrations) {
  try {
    await conn.execute(sql);
    console.log("✓", sql.substring(14, 60));
  } catch (e) {
    if (e.message.includes("already")) {
      console.log("~", sql.substring(14, 60), "(already up to date)");
    } else {
      console.error("✗", e.message);
    }
  }
}

await conn.end();
console.log("Migration complete");
