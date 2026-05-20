CREATE TABLE `app_health_checks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`connectedAppId` int NOT NULL,
	`workspaceId` int NOT NULL,
	`status` enum('up','slow','down') NOT NULL,
	`responseTimeMs` int,
	`statusCode` int,
	`errorMessage` text,
	`checkedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `app_health_checks_id` PRIMARY KEY(`id`)
);
