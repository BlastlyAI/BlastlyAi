CREATE TABLE `review_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`customerName` varchar(255),
	`customerEmail` varchar(255),
	`customerPhone` varchar(32),
	`triggerType` enum('invoice_paid','invoice_sent','job_completed','manual') NOT NULL,
	`channel` enum('sms','email') NOT NULL DEFAULT 'sms',
	`googleReviewUrl` varchar(512),
	`messageTemplate` text,
	`status` enum('pending','sent','clicked','failed') NOT NULL DEFAULT 'pending',
	`sentAt` timestamp,
	`clickedAt` timestamp,
	`externalRef` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `review_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `review_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`autoSendEnabled` boolean NOT NULL DEFAULT true,
	`triggerOnInvoicePaid` boolean NOT NULL DEFAULT true,
	`triggerOnInvoiceSent` boolean NOT NULL DEFAULT false,
	`triggerOnJobCompleted` boolean NOT NULL DEFAULT true,
	`preferredChannel` enum('sms','email') NOT NULL DEFAULT 'sms',
	`delayMinutes` int NOT NULL DEFAULT 60,
	`googleReviewUrl` varchar(512),
	`smsTemplate` text,
	`emailSubject` varchar(255),
	`emailTemplate` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `review_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `review_settings_workspaceId_unique` UNIQUE(`workspaceId`)
);
