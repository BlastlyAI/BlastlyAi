CREATE TABLE `shared_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shareToken` varchar(64) NOT NULL,
	`userId` int,
	`reportType` varchar(32) NOT NULL,
	`websiteUrl` varchar(512) NOT NULL,
	`overallScore` int,
	`scanData` json NOT NULL,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shared_reports_id` PRIMARY KEY(`id`),
	CONSTRAINT `shared_reports_shareToken_unique` UNIQUE(`shareToken`)
);
