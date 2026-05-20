import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

const conn = await mysql.createConnection(DATABASE_URL);

const sql = `
CREATE TABLE IF NOT EXISTS auditReports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shareToken VARCHAR(64) NOT NULL UNIQUE,
  workspaceId INT,
  businessName VARCHAR(255) NOT NULL,
  industry VARCHAR(128),
  website TEXT,
  handles JSON,
  adSpend INT,
  overallScore INT,
  platformScores JSON,
  contentScore INT,
  adQualityScore INT,
  engagementScore INT,
  growthScore INT,
  findings JSON,
  recommendations JSON,
  promoflowPitch JSON,
  rawReport JSON,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`;

try {
  await conn.execute(sql);
  console.log("✅ auditReports table created");
} catch (err) {
  console.error("Migration error:", err.message);
} finally {
  await conn.end();
}
