CREATE TABLE `social_setup_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`step1Done` boolean NOT NULL DEFAULT false,
	`step2Done` boolean NOT NULL DEFAULT false,
	`step3Done` boolean NOT NULL DEFAULT false,
	`activeStep` int NOT NULL DEFAULT 1,
	`completedSetups` json DEFAULT ('[]'),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `social_setup_progress_id` PRIMARY KEY(`id`),
	CONSTRAINT `social_setup_progress_workspaceId_unique` UNIQUE(`workspaceId`)
);
