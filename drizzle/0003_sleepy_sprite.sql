CREATE TABLE `competitor_scans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`websiteUrl` varchar(2048) NOT NULL,
	`brandName` varchar(255),
	`industry` varchar(255),
	`overallGapScore` int NOT NULL DEFAULT 0,
	`userDigitalScore` int NOT NULL DEFAULT 0,
	`competitors` json,
	`improvementOpportunities` json,
	`quickWins` json,
	`industryBenchmark` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `competitor_scans_id` PRIMARY KEY(`id`)
);
