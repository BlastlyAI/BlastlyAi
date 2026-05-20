import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

await conn.execute(`
  CREATE TABLE IF NOT EXISTS video_projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    workspaceId INT NOT NULL,
    userId INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    platform ENUM('tiktok','youtube','instagram','facebook','twitter','linkedin') NOT NULL DEFAULT 'tiktok',
    format ENUM('short','long','reel','story') NOT NULL DEFAULT 'short',
    status ENUM('draft','generating','ready','published') NOT NULL DEFAULT 'draft',
    prompt TEXT,
    script TEXT,
    voiceoverUrl VARCHAR(1024),
    videoUrl VARCHAR(1024),
    thumbnailUrl VARCHAR(1024),
    durationSeconds INT,
    captions JSON,
    hashtags JSON,
    metadata JSON,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_workspace (workspaceId),
    INDEX idx_user (userId),
    INDEX idx_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`);

console.log("✅ video_projects table created");
await conn.end();
