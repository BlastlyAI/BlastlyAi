CREATE TABLE `agentRuns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`createdByUserId` int NOT NULL,
	`type` enum('campaign_agent','website_intelligence','trend_scan','campaign_factory','roi_prediction') NOT NULL,
	`status` enum('pending','running','awaiting_approval','approved','completed','failed') NOT NULL DEFAULT 'pending',
	`inputData` json,
	`steps` json,
	`outputData` json,
	`errorMessage` text,
	`campaignId` int,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agentRuns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `analytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`postId` int,
	`postPlatformId` int,
	`campaignId` int,
	`platform` enum('twitter','linkedin','facebook','instagram','tiktok') NOT NULL,
	`impressions` int DEFAULT 0,
	`clicks` int DEFAULT 0,
	`likes` int DEFAULT 0,
	`comments` int DEFAULT 0,
	`shares` int DEFAULT 0,
	`reach` int DEFAULT 0,
	`utmClicks` int DEFAULT 0,
	`utmConversions` int DEFAULT 0,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analytics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auditReports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shareToken` varchar(64) NOT NULL,
	`workspaceId` int,
	`businessName` varchar(255) NOT NULL,
	`industry` varchar(128),
	`website` text,
	`handles` json,
	`adSpend` int,
	`overallScore` int,
	`platformScores` json,
	`contentScore` int,
	`adQualityScore` int,
	`engagementScore` int,
	`growthScore` int,
	`findings` json,
	`recommendations` json,
	`blastlyPitch` json,
	`rawReport` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditReports_id` PRIMARY KEY(`id`),
	CONSTRAINT `auditReports_shareToken_unique` UNIQUE(`shareToken`)
);
--> statement-breakpoint
CREATE TABLE `brandProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`trainingContent` text,
	`styleProfile` json,
	`sampleOutputs` json,
	`isActive` boolean NOT NULL DEFAULT false,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `brandProfiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `business_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`businessName` varchar(255),
	`industry` varchar(100),
	`goals` text,
	`targetAudience` text,
	`adBudgetRange` varchar(100),
	`brandNameChecked` varchar(255),
	`onboardingStep` int NOT NULL DEFAULT 1,
	`onboardingComplete` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `business_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `business_profiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`promotedUrl` text,
	`goal` enum('awareness','traffic','engagement','conversions','leads'),
	`status` enum('draft','active','paused','completed') NOT NULL DEFAULT 'draft',
	`utmSource` varchar(255),
	`utmMedium` varchar(255),
	`utmCampaign` varchar(255),
	`startsAt` timestamp,
	`endsAt` timestamp,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `competitorMonitors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`handle` varchar(255) NOT NULL,
	`platform` enum('twitter','linkedin','facebook','instagram','tiktok') NOT NULL,
	`displayName` varchar(255),
	`notes` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastCheckedAt` timestamp,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `competitorMonitors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contentLibrary` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`type` enum('template','hashtag_set','brand_asset') NOT NULL,
	`name` varchar(255) NOT NULL,
	`content` text,
	`tags` json,
	`assetUrl` text,
	`assetMimeType` varchar(100),
	`platforms` json,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contentLibrary_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `multimodalCampaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`sourceUrl` text,
	`theme` text,
	`brief` text,
	`assets` json,
	`status` enum('generating','ready','scheduled','published') NOT NULL DEFAULT 'generating',
	`agentRunId` int,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `multimodalCampaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`userId` int NOT NULL,
	`type` varchar(100) NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text,
	`linkUrl` text,
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `platform_connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`platform` varchar(64) NOT NULL,
	`status` enum('connected','pending','skipped','disconnected') NOT NULL DEFAULT 'pending',
	`accountName` varchar(255),
	`accountId` varchar(255),
	`accessToken` text,
	`refreshToken` text,
	`tokenExpiresAt` timestamp,
	`connectedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platform_connections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `postPlatforms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postId` int NOT NULL,
	`socialAccountId` int NOT NULL,
	`platform` enum('twitter','linkedin','facebook','instagram','tiktok') NOT NULL,
	`customText` text,
	`customHashtags` json,
	`status` enum('pending','published','failed') NOT NULL DEFAULT 'pending',
	`platformPostId` varchar(255),
	`publishedAt` timestamp,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `postPlatforms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`campaignId` int,
	`title` varchar(500),
	`bodyText` text,
	`mediaUrls` json,
	`hashtags` json,
	`utmSource` varchar(255),
	`utmMedium` varchar(255),
	`utmCampaign` varchar(255),
	`utmContent` varchar(255),
	`utmTerm` varchar(255),
	`trackedUrl` text,
	`status` enum('draft','scheduled','published','failed','cancelled') NOT NULL DEFAULT 'draft',
	`scheduledAt` timestamp,
	`publishedAt` timestamp,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `roiPredictions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`campaignId` int,
	`agentRunId` int,
	`predictedTraffic` int,
	`predictedConversions` int,
	`predictedRevenue` int,
	`confidence` int,
	`timeframeDays` int DEFAULT 30,
	`modelInputs` json,
	`actualTraffic` int,
	`actualConversions` int,
	`actualRevenue` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `roiPredictions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `socialAccounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`userId` int NOT NULL,
	`platform` enum('twitter','linkedin','facebook','instagram','tiktok') NOT NULL,
	`platformAccountId` varchar(255) NOT NULL,
	`platformUsername` varchar(255),
	`platformDisplayName` varchar(255),
	`platformAvatarUrl` text,
	`accessToken` text,
	`refreshToken` text,
	`tokenExpiresAt` timestamp,
	`scopes` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `socialAccounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`stripeCustomerId` varchar(255),
	`stripeSubscriptionId` varchar(255),
	`plan` enum('free','starter','pro','agency') NOT NULL DEFAULT 'free',
	`status` enum('active','cancelled','past_due','trialing') NOT NULL DEFAULT 'active',
	`currentPeriodEnd` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trendReports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`keywords` json,
	`industry` varchar(255),
	`insights` json,
	`trendingTopics` json,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trendReports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE TABLE `video_projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`platform` enum('twitter','linkedin','facebook','instagram','tiktok','youtube') NOT NULL DEFAULT 'tiktok',
	`format` enum('short','long','reel','story') NOT NULL DEFAULT 'short',
	`status` enum('draft','generating','ready','published') NOT NULL DEFAULT 'draft',
	`prompt` text,
	`script` text,
	`voiceoverUrl` varchar(1024),
	`videoUrl` varchar(1024),
	`thumbnailUrl` varchar(1024),
	`durationSeconds` int,
	`captions` json,
	`hashtags` json,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `video_projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `viralityScores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`postId` int,
	`contentHash` varchar(64),
	`platform` enum('twitter','linkedin','facebook','instagram','tiktok') NOT NULL,
	`score` int NOT NULL,
	`confidence` int NOT NULL,
	`suggestions` json,
	`algorithmFactors` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `viralityScores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `websiteAnalyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`url` text NOT NULL,
	`pageTitle` varchar(500),
	`extractedData` json,
	`lastAnalyzedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `websiteAnalyses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workspaceMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('admin','editor','viewer') NOT NULL DEFAULT 'viewer',
	`invitedByUserId` int,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workspaceMembers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`logoUrl` text,
	`ownerId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workspaces_id` PRIMARY KEY(`id`),
	CONSTRAINT `workspaces_slug_unique` UNIQUE(`slug`)
);
