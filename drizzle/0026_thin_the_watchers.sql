CREATE TABLE `scheduled_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`dueAt` bigint NOT NULL,
	`status` varchar(50) NOT NULL DEFAULT 'pending',
	`draftContent` text,
	`draftPlatforms` varchar(255),
	`approvedAt` bigint,
	`approvedBy` int,
	`reminderSentAt` bigint,
	`ownerNotes` text,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `scheduled_posts_id` PRIMARY KEY(`id`)
);
