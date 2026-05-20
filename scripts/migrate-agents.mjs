import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL not set");

const conn = await mysql.createConnection(DATABASE_URL);

const tables = [
  `CREATE TABLE IF NOT EXISTS agentRuns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    workspaceId INT NOT NULL,
    createdByUserId INT NOT NULL,
    type ENUM('campaign_agent','website_intelligence','trend_scan','campaign_factory','roi_prediction') NOT NULL,
    status ENUM('pending','running','awaiting_approval','approved','completed','failed') NOT NULL DEFAULT 'pending',
    inputData JSON,
    steps JSON,
    outputData JSON,
    errorMessage TEXT,
    campaignId INT,
    startedAt TIMESTAMP NULL,
    completedAt TIMESTAMP NULL,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS viralityScores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    workspaceId INT NOT NULL,
    postId INT,
    contentHash VARCHAR(64),
    platform ENUM('twitter','linkedin','facebook','instagram') NOT NULL,
    score INT NOT NULL,
    confidence INT NOT NULL,
    suggestions JSON,
    algorithmFactors JSON,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS websiteAnalyses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    workspaceId INT NOT NULL,
    url TEXT NOT NULL,
    pageTitle VARCHAR(500),
    extractedData JSON,
    lastAnalyzedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS brandProfiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    workspaceId INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    trainingContent TEXT,
    styleProfile JSON,
    sampleOutputs JSON,
    isActive BOOLEAN NOT NULL DEFAULT FALSE,
    createdByUserId INT NOT NULL,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS trendReports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    workspaceId INT NOT NULL,
    keywords JSON,
    industry VARCHAR(255),
    insights JSON,
    trendingTopics JSON,
    generatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS competitorMonitors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    workspaceId INT NOT NULL,
    handle VARCHAR(255) NOT NULL,
    platform ENUM('twitter','linkedin','facebook','instagram') NOT NULL,
    displayName VARCHAR(255),
    notes TEXT,
    isActive BOOLEAN NOT NULL DEFAULT TRUE,
    lastCheckedAt TIMESTAMP NULL,
    createdByUserId INT NOT NULL,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS multimodalCampaigns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    workspaceId INT NOT NULL,
    sourceUrl TEXT,
    theme TEXT,
    brief TEXT,
    assets JSON,
    status ENUM('generating','ready','scheduled','published') NOT NULL DEFAULT 'generating',
    agentRunId INT,
    createdByUserId INT NOT NULL,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS roiPredictions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    workspaceId INT NOT NULL,
    campaignId INT,
    agentRunId INT,
    predictedTraffic INT,
    predictedConversions INT,
    predictedRevenue INT,
    confidence INT,
    timeframeDays INT DEFAULT 30,
    modelInputs JSON,
    actualTraffic INT,
    actualConversions INT,
    actualRevenue INT,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,
];

for (const sql of tables) {
  const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
  try {
    await conn.execute(sql);
    console.log(`✓ ${tableName}`);
  } catch (err) {
    console.error(`✗ ${tableName}:`, err.message);
  }
}

await conn.end();
console.log("\nAgent tables migration complete.");
