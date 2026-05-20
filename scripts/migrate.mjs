import { createConnection } from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

const conn = await createConnection(DATABASE_URL);

const tables = [
`CREATE TABLE IF NOT EXISTS workspaces (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  logoUrl TEXT,
  ownerId INT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
)`,
`CREATE TABLE IF NOT EXISTS workspaceMembers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workspaceId INT NOT NULL,
  userId INT NOT NULL,
  role ENUM('admin','editor','viewer') DEFAULT 'viewer' NOT NULL,
  invitedByUserId INT,
  joinedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
)`,
`CREATE TABLE IF NOT EXISTS socialAccounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workspaceId INT NOT NULL,
  userId INT NOT NULL,
  platform ENUM('twitter','linkedin','facebook','instagram') NOT NULL,
  platformAccountId VARCHAR(255) NOT NULL,
  platformUsername VARCHAR(255),
  platformDisplayName VARCHAR(255),
  platformAvatarUrl TEXT,
  accessToken TEXT,
  refreshToken TEXT,
  tokenExpiresAt TIMESTAMP NULL,
  scopes TEXT,
  isActive BOOLEAN DEFAULT TRUE NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
)`,
`CREATE TABLE IF NOT EXISTS campaigns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workspaceId INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  promotedUrl TEXT,
  goal ENUM('awareness','traffic','engagement','conversions','leads'),
  status ENUM('draft','active','paused','completed') DEFAULT 'draft' NOT NULL,
  utmSource VARCHAR(255),
  utmMedium VARCHAR(255),
  utmCampaign VARCHAR(255),
  startsAt TIMESTAMP NULL,
  endsAt TIMESTAMP NULL,
  createdByUserId INT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
)`,
`CREATE TABLE IF NOT EXISTS posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workspaceId INT NOT NULL,
  campaignId INT,
  title VARCHAR(500),
  bodyText TEXT,
  mediaUrls JSON,
  hashtags JSON,
  utmSource VARCHAR(255),
  utmMedium VARCHAR(255),
  utmCampaign VARCHAR(255),
  utmContent VARCHAR(255),
  utmTerm VARCHAR(255),
  trackedUrl TEXT,
  status ENUM('draft','scheduled','published','failed','cancelled') DEFAULT 'draft' NOT NULL,
  scheduledAt TIMESTAMP NULL,
  publishedAt TIMESTAMP NULL,
  createdByUserId INT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
)`,
`CREATE TABLE IF NOT EXISTS postPlatforms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  postId INT NOT NULL,
  socialAccountId INT NOT NULL,
  platform ENUM('twitter','linkedin','facebook','instagram') NOT NULL,
  customText TEXT,
  customHashtags JSON,
  status ENUM('pending','published','failed') DEFAULT 'pending' NOT NULL,
  platformPostId VARCHAR(255),
  publishedAt TIMESTAMP NULL,
  errorMessage TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
)`,
`CREATE TABLE IF NOT EXISTS analytics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workspaceId INT NOT NULL,
  postId INT,
  postPlatformId INT,
  campaignId INT,
  platform ENUM('twitter','linkedin','facebook','instagram') NOT NULL,
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  likes INT DEFAULT 0,
  comments INT DEFAULT 0,
  shares INT DEFAULT 0,
  reach INT DEFAULT 0,
  utmClicks INT DEFAULT 0,
  utmConversions INT DEFAULT 0,
  recordedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
)`,
`CREATE TABLE IF NOT EXISTS contentLibrary (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workspaceId INT NOT NULL,
  type ENUM('template','hashtag_set','brand_asset') NOT NULL,
  name VARCHAR(255) NOT NULL,
  content TEXT,
  tags JSON,
  assetUrl TEXT,
  assetMimeType VARCHAR(100),
  platforms JSON,
  createdByUserId INT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
)`,
`CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workspaceId INT NOT NULL,
  userId INT NOT NULL,
  type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  linkUrl TEXT,
  isRead BOOLEAN DEFAULT FALSE NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
)`
];

for (const sql of tables) {
  try {
    await conn.execute(sql);
    const m = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/);
    if (m) console.log("✓", m[1]);
  } catch(e) { console.error("✗", e.message); }
}
await conn.end();
console.log("\n✅ Migration complete");
