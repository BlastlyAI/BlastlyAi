CREATE TABLE `appointment_reminder_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`confirmationSms` text,
	`reminder24Sms` text,
	`reminder2Sms` text,
	`reviewSms` text,
	`confirmationEmail` text,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `appointment_reminder_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `appointment_reminder_templates_workspaceId_unique` UNIQUE(`workspaceId`)
);
--> statement-breakpoint
CREATE TABLE `appointment_services` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`durationMinutes` int NOT NULL DEFAULT 30,
	`priceCents` int NOT NULL DEFAULT 0,
	`description` text,
	`color` varchar(16) DEFAULT '#6366f1',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `appointment_services_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `booking_portal_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`isEnabled` boolean NOT NULL DEFAULT false,
	`slug` varchar(64),
	`welcomeMessage` text,
	`businessHours` text,
	`bufferMinutes` int NOT NULL DEFAULT 15,
	`maxDaysAhead` int NOT NULL DEFAULT 30,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `booking_portal_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `booking_portal_settings_workspaceId_unique` UNIQUE(`workspaceId`),
	CONSTRAINT `booking_portal_settings_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `gift_vouchers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`code` varchar(32) NOT NULL,
	`amountCents` int NOT NULL,
	`balanceCents` int NOT NULL,
	`issuedByUserId` int NOT NULL,
	`note` text,
	`expiresAt` bigint,
	`redeemedAt` bigint,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `gift_vouchers_id` PRIMARY KEY(`id`),
	CONSTRAINT `gift_vouchers_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `loyalty_balances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`contactId` int NOT NULL,
	`pointsBalance` int NOT NULL DEFAULT 0,
	`totalEarned` int NOT NULL DEFAULT 0,
	`totalRedeemed` int NOT NULL DEFAULT 0,
	`lastSmsSentAt` bigint,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `loyalty_balances_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `loyalty_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`isEnabled` boolean NOT NULL DEFAULT false,
	`pointsPerDollar` int NOT NULL DEFAULT 2,
	`dollarsPerPoint` int NOT NULL DEFAULT 10,
	`smsFrequencyDays` int NOT NULL DEFAULT 21,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `loyalty_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `loyalty_settings_workspaceId_unique` UNIQUE(`workspaceId`)
);
--> statement-breakpoint
CREATE TABLE `quick_charge_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`amountCents` int NOT NULL,
	`type` varchar(32) NOT NULL,
	`reference` varchar(128),
	`contactId` int,
	`note` text,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `quick_charge_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `voucher_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`defaultExpiryDays` int NOT NULL DEFAULT 365,
	`minAmountCents` int NOT NULL DEFAULT 500,
	`maxAmountCents` int NOT NULL DEFAULT 50000,
	`prefix` varchar(8) NOT NULL DEFAULT 'GV',
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `voucher_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `voucher_settings_workspaceId_unique` UNIQUE(`workspaceId`)
);
--> statement-breakpoint
ALTER TABLE `appointments` MODIFY COLUMN `clientName` varchar(128);--> statement-breakpoint
ALTER TABLE `appointments` MODIFY COLUMN `clientPhone` varchar(32);--> statement-breakpoint
ALTER TABLE `appointments` MODIFY COLUMN `clientEmail` varchar(256);--> statement-breakpoint
ALTER TABLE `appointments` MODIFY COLUMN `status` varchar(32) NOT NULL DEFAULT 'confirmed';--> statement-breakpoint
ALTER TABLE `appointments` MODIFY COLUMN `paymentMethod` varchar(32);--> statement-breakpoint
ALTER TABLE `appointments` ADD `contactId` int;--> statement-breakpoint
ALTER TABLE `appointments` ADD `serviceId` int;--> statement-breakpoint
ALTER TABLE `appointments` ADD `title` varchar(256) NOT NULL;--> statement-breakpoint
ALTER TABLE `appointments` ADD `startAt` bigint NOT NULL;--> statement-breakpoint
ALTER TABLE `appointments` ADD `endAt` bigint NOT NULL;--> statement-breakpoint
ALTER TABLE `appointments` ADD `notes` text;--> statement-breakpoint
ALTER TABLE `appointments` ADD `amountCents` int;--> statement-breakpoint
ALTER TABLE `appointments` ADD `loyaltyPointsEarned` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `appointments` ADD `loyaltyPointsRedeemed` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `appointments` ADD `confirmationSent` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `appointments` ADD `reminder24Sent` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `appointments` ADD `reminder2Sent` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `appointments` ADD `reviewSent` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `appointments` ADD `bookingToken` varchar(64);--> statement-breakpoint
ALTER TABLE `appointments` ADD `source` varchar(32) DEFAULT 'manual';--> statement-breakpoint
ALTER TABLE `appointments` DROP COLUMN `clientAddress`;--> statement-breakpoint
ALTER TABLE `appointments` DROP COLUMN `serviceTitle`;--> statement-breakpoint
ALTER TABLE `appointments` DROP COLUMN `serviceNotes`;--> statement-breakpoint
ALTER TABLE `appointments` DROP COLUMN `scheduledAt`;--> statement-breakpoint
ALTER TABLE `appointments` DROP COLUMN `durationMins`;--> statement-breakpoint
ALTER TABLE `appointments` DROP COLUMN `jobNotes`;--> statement-breakpoint
ALTER TABLE `appointments` DROP COLUMN `jobAmount`;--> statement-breakpoint
ALTER TABLE `appointments` DROP COLUMN `completedAt`;--> statement-breakpoint
ALTER TABLE `appointments` DROP COLUMN `invoiceRef`;--> statement-breakpoint
ALTER TABLE `appointments` DROP COLUMN `smsConfirmSent`;--> statement-breakpoint
ALTER TABLE `appointments` DROP COLUMN `smsReminderSent`;--> statement-breakpoint
ALTER TABLE `appointments` DROP COLUMN `smsOnWaySent`;--> statement-breakpoint
ALTER TABLE `appointments` DROP COLUMN `smsThankYouSent`;--> statement-breakpoint
ALTER TABLE `appointments` DROP COLUMN `reviewRequestAt`;