CREATE TABLE `social_scans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`websiteUrl` varchar(2048) NOT NULL,
	`websiteSeoScore` int,
	`overallScore` int NOT NULL DEFAULT 0,
	`discoveredProfiles` json,
	`platformScores` json,
	`recommendations` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `social_scans_id` PRIMARY KEY(`id`)
);
