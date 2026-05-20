CREATE TABLE `trial_feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`workspaceId` int,
	`weekNumber` int NOT NULL,
	`submissionNumber` int NOT NULL,
	`overallRating` int NOT NULL,
	`whatWorked` text,
	`whatDidntWork` text,
	`suggestions` text,
	`postCount` int,
	`wouldRecommend` tinyint,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `trial_feedback_id` PRIMARY KEY(`id`)
);
