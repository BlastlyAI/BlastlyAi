CREATE TABLE `workspace_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`colorScheme` enum('bold','soft','warm') NOT NULL DEFAULT 'bold',
	`homeMode` enum('dashboard','assistant') NOT NULL DEFAULT 'dashboard',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workspace_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `workspace_preferences_workspaceId_unique` UNIQUE(`workspaceId`)
);
