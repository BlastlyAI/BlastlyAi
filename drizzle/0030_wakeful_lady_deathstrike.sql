CREATE TABLE `pending_snaps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionToken` varchar(64) NOT NULL,
	`imageUrl` text NOT NULL,
	`caption` text NOT NULL,
	`hashtags` text NOT NULL,
	`platform` varchar(32) NOT NULL,
	`websiteUrl` varchar(512),
	`published` tinyint NOT NULL DEFAULT 0,
	`publishedAt` bigint,
	`expiresAt` bigint NOT NULL,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `pending_snaps_id` PRIMARY KEY(`id`),
	CONSTRAINT `pending_snaps_sessionToken_unique` UNIQUE(`sessionToken`)
);
