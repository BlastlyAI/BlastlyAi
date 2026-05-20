CREATE TABLE `intelligence_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`userId` int NOT NULL,
	`websiteUrl` varchar(2048) NOT NULL,
	`reportVersion` varchar(10) NOT NULL DEFAULT '1.0',
	`overallConfidenceScore` int NOT NULL DEFAULT 0,
	`reportData` json NOT NULL,
	`brandVoice` json,
	`status` enum('generating','partial','complete','failed') NOT NULL DEFAULT 'generating',
	`sectionsCompleted` json DEFAULT ('[]'),
	`auditShareToken` varchar(64),
	`strategyApproved` boolean NOT NULL DEFAULT false,
	`strategyApprovedAt` bigint,
	`strategyApprovedBy` int,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `intelligence_reports_id` PRIMARY KEY(`id`)
);
