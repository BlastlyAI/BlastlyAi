import { getDb } from "./db";

async function migrate() {
  const db = await getDb();
  if (!db) { console.error("No DB"); process.exit(1); }

  const conn = (db as any).session?.client ?? (db as any).$client;

  const sql1 = `
    CREATE TABLE IF NOT EXISTS \`channel_connections\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`workspaceId\` int NOT NULL,
      \`channelType\` enum('email_gmail','email_outlook','email_imap','sms','google_business','calendar_google','calendar_calendly','calendar_acuity','calendar_simplybook','calendar_square','payment_square','payment_stripe','payment_xero','payment_myob','payment_paypal','payment_shopify') NOT NULL,
      \`status\` enum('connected','pending','skipped','disconnected') NOT NULL DEFAULT 'pending',
      \`accountName\` varchar(255),
      \`accountEmail\` varchar(255),
      \`phoneNumber\` varchar(32),
      \`accessToken\` text,
      \`refreshToken\` text,
      \`tokenExpiresAt\` timestamp NULL,
      \`metadata\` json,
      \`connectedAt\` timestamp NULL,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`channel_connections_id\` PRIMARY KEY(\`id\`)
    )
  `;

  const sql2 = `
    CREATE TABLE IF NOT EXISTS \`intelligence_feed_items\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`workspaceId\` int NOT NULL,
      \`priority\` int NOT NULL DEFAULT 6,
      \`itemType\` enum('appointment_upcoming','appointment_conflict','lead_new','booking_request','message_dm','message_sms','message_email','post_approval','review_negative','traction_post','budget_low','website_suggestion','invoice_paid','competitor_alert') NOT NULL,
      \`channel\` varchar(64),
      \`senderName\` varchar(255),
      \`senderAvatar\` varchar(512),
      \`messageSnippet\` text,
      \`aiContextLine\` text,
      \`aiDraftReply\` text,
      \`scheduledAt\` timestamp NULL,
      \`metadata\` json,
      \`status\` enum('pending','actioned','dismissed') NOT NULL DEFAULT 'pending',
      \`actionedAt\` timestamp NULL,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`intelligence_feed_items_id\` PRIMARY KEY(\`id\`)
    )
  `;

  await conn.execute(sql1);
  console.log("✓ channel_connections table created");
  await conn.execute(sql2);
  console.log("✓ intelligence_feed_items table created");
  await conn.end?.();
  console.log("Done");
}

migrate().catch(console.error);
