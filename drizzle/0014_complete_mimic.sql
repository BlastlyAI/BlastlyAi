CREATE TABLE `quick_captures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`submittedByUserId` int NOT NULL,
	`mediaUrl` text,
	`mediaKey` varchar(512),
	`mediaType` varchar(20),
	`voiceUrl` text,
	`voiceKey` varchar(512),
	`voiceTranscript` text,
	`textNote` text,
	`aiGeneratedPosts` json,
	`status` varchar(30) NOT NULL DEFAULT 'pending_ai',
	`agencyNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quick_captures_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reminder_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`reminderDays` json,
	`reminderHour` int DEFAULT 9,
	`lastSentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reminder_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `reminder_settings_workspaceId_unique` UNIQUE(`workspaceId`)
);
