CREATE TABLE `client_monthly_stats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`month` varchar(10) NOT NULL,
	`blogsPublished` int NOT NULL DEFAULT 0,
	`socialPostsPublished` int NOT NULL DEFAULT 0,
	`peopleReached` int NOT NULL DEFAULT 0,
	`callsHandled` int NOT NULL DEFAULT 0,
	`appointmentsBooked` int NOT NULL DEFAULT 0,
	`newEnquiries` int NOT NULL DEFAULT 0,
	`aiCitations` int NOT NULL DEFAULT 0,
	`hoursSaved` int NOT NULL DEFAULT 0,
	`activeFeatures` json DEFAULT ('[]'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `client_monthly_stats_id` PRIMARY KEY(`id`)
);
