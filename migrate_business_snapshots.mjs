import { createConnection } from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();
const conn = await createConnection(process.env.DATABASE_URL);
await conn.execute(`CREATE TABLE IF NOT EXISTS \`business_snapshots\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`userId\` int NOT NULL,
  \`snapshotType\` varchar(50) NOT NULL DEFAULT 'day_zero',
  \`platformCount\` int DEFAULT 0,
  \`hoursPerWeek\` int DEFAULT 0,
  \`totalFollowers\` int DEFAULT 0,
  \`avgPostReach\` int DEFAULT 0,
  \`postsPerWeek\` int DEFAULT 0,
  \`leadsPerWeek\` int DEFAULT 0,
  \`monthlyRevenue\` int DEFAULT 0,
  \`blastlyHoursPerWeek\` int DEFAULT 0,
  \`blastlyLeadsPerWeek\` int DEFAULT 0,
  \`blastlyPostReach\` int DEFAULT 0,
  \`notes\` text,
  \`createdAt\` bigint NOT NULL,
  CONSTRAINT \`business_snapshots_id\` PRIMARY KEY(\`id\`)
)`);
console.log("business_snapshots table created successfully");
await conn.end();
