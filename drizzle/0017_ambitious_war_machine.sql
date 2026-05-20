CREATE TABLE `post_queue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`type` varchar(20) NOT NULL DEFAULT 'client',
	`mediaUrl` text,
	`mediaKey` varchar(512),
	`caption` text,
	`hashtags` text,
	`platforms` json,
	`scheduledDate` timestamp,
	`isUrgent` boolean NOT NULL DEFAULT false,
	`detectedEventName` varchar(255),
	`detectedPersonName` varchar(255),
	`status` varchar(30) NOT NULL DEFAULT 'pending_review',
	`agencyNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `post_queue_id` PRIMARY KEY(`id`)
);
