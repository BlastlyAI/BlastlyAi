CREATE TABLE `brand_briefs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`businessDescription` text,
	`productsServices` text,
	`differentiators` text,
	`neverSay` text,
	`targetAudience` text,
	`tone` enum('professional','friendly','bold','nurturing','humorous','authoritative','casual') DEFAULT 'friendly',
	`approvedPhrases` text,
	`avoidPhrases` text,
	`brandColors` json,
	`logoUrl` text,
	`complianceRules` text,
	`noPriceClaims` boolean DEFAULT false,
	`noTestimonials` boolean DEFAULT false,
	`noCompetitorMentions` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `brand_briefs_id` PRIMARY KEY(`id`),
	CONSTRAINT `brand_briefs_workspaceId_unique` UNIQUE(`workspaceId`)
);
--> statement-breakpoint
CREATE TABLE `brand_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`label` varchar(255),
	`isApproved` boolean NOT NULL DEFAULT true,
	`uploadedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `brand_photos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `posts` ADD `approvalStatus` enum('draft','pending_agency','pending_client','approved','rejected','scheduled','published') DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE `posts` ADD `agencyNote` text;--> statement-breakpoint
ALTER TABLE `posts` ADD `clientNote` text;--> statement-breakpoint
ALTER TABLE `posts` ADD `previewToken` varchar(64);--> statement-breakpoint
ALTER TABLE `posts` ADD `approvedByUserId` int;--> statement-breakpoint
ALTER TABLE `posts` ADD `approvedAt` timestamp;