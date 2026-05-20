CREATE TABLE `contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`firstName` varchar(128) NOT NULL,
	`lastName` varchar(128),
	`phone` varchar(32),
	`email` varchar(255),
	`tags` varchar(512),
	`notes` text,
	`source` varchar(64),
	`optedOut` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sms_campaign_recipients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`contactId` int NOT NULL,
	`phone` varchar(32) NOT NULL,
	`personalised` text,
	`status` enum('queued','sent','delivered','failed','opted_out') NOT NULL DEFAULT 'queued',
	`externalRef` varchar(255),
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sms_campaign_recipients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sms_campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`messageTemplate` text NOT NULL,
	`mediaUrl` varchar(512),
	`tagFilter` varchar(512),
	`deliveryChannel` enum('sms','social','both') NOT NULL DEFAULT 'sms',
	`status` enum('draft','sending','sent','failed') NOT NULL DEFAULT 'draft',
	`totalRecipients` int NOT NULL DEFAULT 0,
	`sentCount` int NOT NULL DEFAULT 0,
	`failedCount` int NOT NULL DEFAULT 0,
	`scheduledAt` timestamp,
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sms_campaigns_id` PRIMARY KEY(`id`)
);
