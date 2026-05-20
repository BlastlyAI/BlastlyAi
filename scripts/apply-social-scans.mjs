import { createConnection } from "mysql2/promise";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const conn = await createConnection(DATABASE_URL);

const sql = `CREATE TABLE IF NOT EXISTS \`social_scans\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`userId\` int NOT NULL,
  \`websiteUrl\` varchar(2048) NOT NULL,
  \`websiteSeoScore\` int,
  \`overallScore\` int NOT NULL DEFAULT 0,
  \`discoveredProfiles\` json,
  \`platformScores\` json,
  \`recommendations\` json,
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT \`social_scans_id\` PRIMARY KEY(\`id\`)
)`;

try {
  await conn.execute(sql);
  console.log("✅ social_scans table created or already exists");
} catch (err) {
  console.error("❌ Migration failed:", err.message);
} finally {
  await conn.end();
}
