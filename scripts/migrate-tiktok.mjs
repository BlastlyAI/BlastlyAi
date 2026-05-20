import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }

const conn = await mysql.createConnection(url);

const ENUM_VAL = "'twitter','linkedin','facebook','instagram','tiktok'";

const alterStatements = [
  `ALTER TABLE socialAccounts MODIFY COLUMN platform ENUM(${ENUM_VAL}) NOT NULL`,
  `ALTER TABLE postPlatforms MODIFY COLUMN platform ENUM(${ENUM_VAL}) NOT NULL`,
  `ALTER TABLE analytics MODIFY COLUMN platform ENUM(${ENUM_VAL}) NOT NULL`,
  `ALTER TABLE viralityScores MODIFY COLUMN platform ENUM(${ENUM_VAL}) NOT NULL`,
  `ALTER TABLE competitorMonitors MODIFY COLUMN platform ENUM(${ENUM_VAL}) NOT NULL`,
];

for (const sql of alterStatements) {
  try {
    await conn.execute(sql);
    console.log("✓", sql.split(" MODIFY")[0].replace("ALTER TABLE ", ""));
  } catch (err) {
    console.warn("⚠ Skipped (may not exist):", err.message);
  }
}

await conn.end();
console.log("✅ TikTok enum migration complete");
