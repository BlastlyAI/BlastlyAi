import "dotenv/config";
import mysql from "mysql2/promise";

const sql = `CREATE TABLE IF NOT EXISTS \`subscriptions\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`userId\` int NOT NULL,
  \`stripeCustomerId\` varchar(255),
  \`stripeSubscriptionId\` varchar(255),
  \`plan\` enum('free','starter','pro','agency') NOT NULL DEFAULT 'free',
  \`status\` enum('active','cancelled','past_due','trialing') NOT NULL DEFAULT 'active',
  \`currentPeriodEnd\` timestamp NULL,
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT \`subscriptions_id\` PRIMARY KEY(\`id\`)
)`;

const conn = await mysql.createConnection(process.env.DATABASE_URL);
await conn.execute(sql);
console.log("✅ subscriptions table created (or already exists)");
await conn.end();
