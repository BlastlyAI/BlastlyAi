ALTER TABLE `analytics` MODIFY COLUMN `platform` enum('twitter','linkedin','facebook','instagram','tiktok','reddit') NOT NULL;--> statement-breakpoint
ALTER TABLE `competitorMonitors` MODIFY COLUMN `platform` enum('twitter','linkedin','facebook','instagram','tiktok','reddit') NOT NULL;--> statement-breakpoint
ALTER TABLE `postPlatforms` MODIFY COLUMN `platform` enum('twitter','linkedin','facebook','instagram','tiktok','reddit') NOT NULL;--> statement-breakpoint
ALTER TABLE `socialAccounts` MODIFY COLUMN `platform` enum('twitter','linkedin','facebook','instagram','tiktok','reddit') NOT NULL;--> statement-breakpoint
ALTER TABLE `viralityScores` MODIFY COLUMN `platform` enum('twitter','linkedin','facebook','instagram','tiktok','reddit') NOT NULL;