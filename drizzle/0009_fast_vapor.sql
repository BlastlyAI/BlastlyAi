CREATE TABLE `connected_apps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`appSlug` varchar(64) NOT NULL,
	`appName` varchar(128) NOT NULL,
	`webhookSecret` varchar(64) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastEventAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `connected_apps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webhook_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`connectedAppId` int NOT NULL,
	`workspaceId` int NOT NULL,
	`eventType` varchar(64) NOT NULL,
	`payload` json NOT NULL,
	`status` enum('pending','done','error') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`generatedPostIds` json,
	`processedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `webhook_events_id` PRIMARY KEY(`id`)
);
