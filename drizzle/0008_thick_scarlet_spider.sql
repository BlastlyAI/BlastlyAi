ALTER TABLE `workspaces` ADD `planTier` enum('free','fix_my_brand','managed_social') DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `stripeCustomerId` varchar(255);--> statement-breakpoint
ALTER TABLE `workspaces` ADD `stripeSubscriptionId` varchar(255);--> statement-breakpoint
ALTER TABLE `workspaces` ADD `subscriptionStatus` enum('active','cancelled','past_due','trialing','none') DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `trialEndsAt` timestamp;