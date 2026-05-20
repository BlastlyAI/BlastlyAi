ALTER TABLE `workspaces` ADD `website` varchar(512);--> statement-breakpoint
ALTER TABLE `workspaces` ADD `industry` varchar(128);--> statement-breakpoint
ALTER TABLE `workspaces` ADD `description` text;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `primaryColor` varchar(32);--> statement-breakpoint
ALTER TABLE `workspaces` ADD `secondaryColor` varchar(32);--> statement-breakpoint
ALTER TABLE `workspaces` ADD `toneOfVoice` varchar(64);--> statement-breakpoint
ALTER TABLE `workspaces` ADD `targetAudience` text;