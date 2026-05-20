import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

await conn.execute(`
CREATE TABLE IF NOT EXISTS \`seo_scans\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`userId\` int NOT NULL,
  \`url\` varchar(2048) NOT NULL,
  \`score\` int NOT NULL DEFAULT 0,
  \`title\` varchar(512),
  \`metaDescription\` text,
  \`h1Tags\` json,
  \`keywords\` json,
  \`pageSpeedScore\` int,
  \`httpsEnabled\` boolean DEFAULT false,
  \`wordCount\` int,
  \`imagesWithoutAlt\` int,
  \`internalLinks\` int,
  \`externalLinks\` int,
  \`recommendations\` json,
  \`rawHtml\` text,
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT \`seo_scans_id\` PRIMARY KEY(\`id\`)
)
`);

console.log("✅ seo_scans table created");
await conn.end();
