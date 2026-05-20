import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const statements = [
  `CREATE TABLE IF NOT EXISTS business_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL UNIQUE,
    businessName VARCHAR(255),
    industry VARCHAR(100),
    goals TEXT,
    targetAudience TEXT,
    adBudgetRange VARCHAR(100),
    brandNameChecked VARCHAR(255),
    onboardingStep INT NOT NULL DEFAULT 1,
    onboardingComplete INT NOT NULL DEFAULT 0,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS platform_connections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    platform VARCHAR(64) NOT NULL,
    status ENUM('connected','pending','skipped','disconnected') NOT NULL DEFAULT 'pending',
    accountName VARCHAR(255),
    accountId VARCHAR(255),
    accessToken TEXT,
    refreshToken TEXT,
    tokenExpiresAt TIMESTAMP NULL,
    connectedAt TIMESTAMP NULL,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_platform (userId, platform)
  )`,
];

for (const sql of statements) {
  await conn.execute(sql);
  console.log("✓", sql.slice(0, 60).trim());
}

await conn.end();
console.log("\n✅ Onboarding tables created successfully");
