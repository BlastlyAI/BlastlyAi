CREATE TABLE `channel_connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`channelType` enum('email_gmail','email_outlook','email_imap','sms','google_business','calendar_google','calendar_calendly','calendar_acuity','calendar_simplybook','calendar_square','payment_square','payment_stripe','payment_xero','payment_myob','payment_paypal','payment_shopify') NOT NULL,
	`status` enum('connected','pending','skipped','disconnected') NOT NULL DEFAULT 'pending',
	`accountName` varchar(255),
	`accountEmail` varchar(255),
	`phoneNumber` varchar(32),
	`accessToken` text,
	`refreshToken` text,
	`tokenExpiresAt` timestamp,
	`metadata` json,
	`connectedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `channel_connections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `intelligence_feed_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`priority` int NOT NULL DEFAULT 6,
	`itemType` enum('appointment_upcoming','appointment_conflict','lead_new','booking_request','message_dm','message_sms','message_email','post_approval','review_negative','traction_post','budget_low','website_suggestion','invoice_paid','competitor_alert') NOT NULL,
	`channel` varchar(64),
	`senderName` varchar(255),
	`senderAvatar` varchar(512),
	`messageSnippet` text,
	`aiContextLine` text,
	`aiDraftReply` text,
	`scheduledAt` timestamp,
	`metadata` json,
	`status` enum('pending','actioned','dismissed') NOT NULL DEFAULT 'pending',
	`actionedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `intelligence_feed_items_id` PRIMARY KEY(`id`)
);
