CREATE TABLE `content_assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`mimeType` varchar(100),
	`voiceNoteUrl` text,
	`voiceTranscript` text,
	`aiCaptions` json,
	`selectedPlatforms` json,
	`status` enum('uploading','transcribing','captioning','ready','approved','published','failed') NOT NULL DEFAULT 'uploading',
	`publishedPostId` int,
	`scheduledAt` timestamp,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `content_assets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `credit_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`amount` int NOT NULL,
	`type` enum('purchase','deduct','refund','bonus') NOT NULL,
	`description` varchar(255),
	`stripePaymentIntentId` varchar(255),
	`postId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `credit_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `workspaces` ADD `ayrshareProfileKey` varchar(255);--> statement-breakpoint
ALTER TABLE `workspaces` ADD `setupFeePaid` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `creditsBalance` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `selectedPlatforms` json;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `onboardingStep` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `onboardingComplete` boolean DEFAULT false NOT NULL;