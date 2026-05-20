CREATE TABLE `ad_wallet` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`balanceCents` int NOT NULL DEFAULT 0,
	`monthlyBudgetCents` int NOT NULL DEFAULT 10000,
	`spentThisMonthCents` int NOT NULL DEFAULT 0,
	`autoTopUp` boolean NOT NULL DEFAULT false,
	`autoTopUpThresholdCents` int DEFAULT 2000,
	`autoTopUpAmountCents` int DEFAULT 10000,
	`stripeCustomerId` varchar(255),
	`stripePaymentMethodId` varchar(255),
	`nextResetDate` timestamp,
	`lowBalanceReminderSentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ad_wallet_id` PRIMARY KEY(`id`),
	CONSTRAINT `ad_wallet_workspaceId_unique` UNIQUE(`workspaceId`)
);
--> statement-breakpoint
CREATE TABLE `wallet_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`type` varchar(20) NOT NULL,
	`amountCents` int NOT NULL,
	`balanceAfterCents` int NOT NULL,
	`description` varchar(512),
	`stripePaymentIntentId` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wallet_transactions_id` PRIMARY KEY(`id`)
);
