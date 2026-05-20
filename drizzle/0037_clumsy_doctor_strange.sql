ALTER TABLE `workspace_preferences` ADD `ariaOpeningHours` text;--> statement-breakpoint
ALTER TABLE `workspace_preferences` ADD `ariaHandoffName` varchar(120);--> statement-breakpoint
ALTER TABLE `workspace_preferences` ADD `ariaHandoffMobile` varchar(30);--> statement-breakpoint
ALTER TABLE `workspace_preferences` ADD `ariaActiveMode` enum('always_on','after_hours','manual') DEFAULT 'always_on';--> statement-breakpoint
ALTER TABLE `workspace_preferences` ADD `briefingStartHour` int DEFAULT 8;--> statement-breakpoint
ALTER TABLE `workspace_preferences` ADD `alertMode` enum('instant','briefing_only','both') DEFAULT 'both';--> statement-breakpoint
ALTER TABLE `workspace_preferences` ADD `quietHoursStart` int DEFAULT 21;--> statement-breakpoint
ALTER TABLE `workspace_preferences` ADD `quietHoursEnd` int DEFAULT 7;