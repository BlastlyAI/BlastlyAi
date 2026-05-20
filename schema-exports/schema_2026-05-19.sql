-- Blastly / PromoFlow AI — Full Database Schema Export
-- Generated: 2026-05-19T12:41:16.175Z

SET FOREIGN_KEY_CHECKS=0;

CREATE TABLE `__drizzle_migrations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `hash` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` bigint DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=254701;

CREATE TABLE `achievements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `badgeIcon` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `badgeColor` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pointsValue` int NOT NULL DEFAULT '0',
  `subjectId` int DEFAULT NULL,
  `unitId` int DEFAULT NULL,
  `earnedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ad_wallet` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workspaceId` int NOT NULL,
  `balanceCents` int NOT NULL DEFAULT '0',
  `monthlyBudgetCents` int NOT NULL DEFAULT '10000',
  `spentThisMonthCents` int NOT NULL DEFAULT '0',
  `autoTopUp` tinyint(1) NOT NULL DEFAULT '0',
  `autoTopUpThresholdCents` int DEFAULT '2000',
  `autoTopUpAmountCents` int DEFAULT '10000',
  `stripeCustomerId` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `stripePaymentMethodId` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nextResetDate` timestamp NULL DEFAULT NULL,
  `lowBalanceReminderSentAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `ad_wallet_workspaceId_unique` (`workspaceId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=60001;

CREATE TABLE `agentRuns` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workspaceId` int NOT NULL,
  `createdByUserId` int NOT NULL,
  `type` enum('campaign_agent','website_intelligence','trend_scan','campaign_factory','roi_prediction') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('pending','running','awaiting_approval','approved','completed','failed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `inputData` json DEFAULT NULL,
  `steps` json DEFAULT NULL,
  `outputData` json DEFAULT NULL,
  `errorMessage` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `campaignId` int DEFAULT NULL,
  `startedAt` timestamp NULL DEFAULT NULL,
  `completedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `analytics` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workspaceId` int NOT NULL,
  `postId` int DEFAULT NULL,
  `postPlatformId` int DEFAULT NULL,
  `campaignId` int DEFAULT NULL,
  `platform` enum('twitter','linkedin','facebook','instagram','tiktok','reddit','youtube','pinterest','bluesky') COLLATE utf8mb4_unicode_ci NOT NULL,
  `impressions` int DEFAULT '0',
  `clicks` int DEFAULT '0',
  `likes` int DEFAULT '0',
  `comments` int DEFAULT '0',
  `shares` int DEFAULT '0',
  `reach` int DEFAULT '0',
  `utmClicks` int DEFAULT '0',
  `utmConversions` int DEFAULT '0',
  `recordedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `app_health_checks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `connectedAppId` int NOT NULL,
  `workspaceId` int NOT NULL,
  `status` enum('up','slow','down') COLLATE utf8mb4_unicode_ci NOT NULL,
  `responseTimeMs` int DEFAULT NULL,
  `statusCode` int DEFAULT NULL,
  `errorMessage` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `checkedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=15000001;

CREATE TABLE `appointment_reminder_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workspaceId` int NOT NULL,
  `confirmationSms` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reminder24Sms` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reminder2Sms` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reviewSms` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `confirmationEmail` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` bigint NOT NULL,
  `updatedAt` bigint NOT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `workspaceId` (`workspaceId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `appointment_services` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workspaceId` int NOT NULL,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `durationMinutes` int NOT NULL DEFAULT '30',
  `priceCents` int NOT NULL DEFAULT '0',
  `description` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `color` varchar(16) COLLATE utf8mb4_unicode_ci DEFAULT '#6366f1',
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` bigint NOT NULL,
  `updatedAt` bigint NOT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `appointments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workspaceId` int NOT NULL,
  `contactId` int DEFAULT NULL,
  `serviceId` int DEFAULT NULL,
  `title` varchar(256) COLLATE utf8mb4_unicode_ci NOT NULL,
  `clientName` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `clientPhone` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `clientEmail` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `startAt` bigint NOT NULL,
  `endAt` bigint NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'confirmed',
  `paymentMethod` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amountCents` int DEFAULT NULL,
  `loyaltyPointsEarned` int DEFAULT '0',
  `loyaltyPointsRedeemed` int DEFAULT '0',
  `confirmationSent` tinyint(1) NOT NULL DEFAULT '0',
  `reminder24Sent` tinyint(1) NOT NULL DEFAULT '0',
  `reminder2Sent` tinyint(1) NOT NULL DEFAULT '0',
  `reviewSent` tinyint(1) NOT NULL DEFAULT '0',
  `bookingToken` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT 'manual',
  `createdAt` bigint NOT NULL,
  `updatedAt` bigint NOT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `auditReports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `shareToken` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `workspaceId` int DEFAULT NULL,
  `businessName` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `industry` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `website` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `handles` json DEFAULT NULL,
  `adSpend` int DEFAULT NULL,
  `overallScore` int DEFAULT NULL,
  `platformScores` json DEFAULT NULL,
  `contentScore` int DEFAULT NULL,
  `adQualityScore` int DEFAULT NULL,
  `engagementScore` int DEFAULT NULL,
  `growthScore` int DEFAULT NULL,
  `findings` json DEFAULT NULL,
  `recommendations` json DEFAULT NULL,
  `blastlyPitch` json DEFAULT NULL,
  `rawReport` json DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `cyberSecurityScore` int DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `detectedHandles` json DEFAULT NULL,
  `geographicReach` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `shareToken` (`shareToken`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=630001;

CREATE TABLE `booking_portal_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workspaceId` int NOT NULL,
  `isEnabled` tinyint(1) NOT NULL DEFAULT '0',
  `slug` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `welcomeMessage` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `businessHours` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bufferMinutes` int NOT NULL DEFAULT '15',
  `maxDaysAhead` int NOT NULL DEFAULT '30',
  `createdAt` bigint NOT NULL,
  `updatedAt` bigint NOT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `workspaceId` (`workspaceId`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `brandProfiles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workspaceId` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `trainingContent` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `styleProfile` json DEFAULT NULL,
  `sampleOutputs` json DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '0',
  `createdByUserId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `brand_briefs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workspaceId` int NOT NULL,
  `businessDescription` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `productsServices` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `differentiators` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `neverSay` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `targetAudience` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tone` enum('professional','friendly','bold','nurturing','humorous','authoritative','casual') COLLATE utf8mb4_unicode_ci DEFAULT 'friendly',
  `approvedPhrases` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avoidPhrases` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `brandColors` json DEFAULT NULL,
  `logoUrl` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `complianceRules` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `noPriceClaims` tinyint(1) DEFAULT '0',
  `noTestimonials` tinyint(1) DEFAULT '0',
  `noCompetitorMentions` tinyint(1) DEFAULT '1',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `brand_briefs_workspaceId_unique` (`workspaceId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `brand_photos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workspaceId` int NOT NULL,
  `fileUrl` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `fileKey` varchar(512) COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isApproved` tinyint(1) NOT NULL DEFAULT '1',
  `uploadedByUserId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `business_profiles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `businessName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `industry` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `goals` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `targetAudience` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `adBudgetRange` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `brandNameChecked` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `onboardingStep` int NOT NULL DEFAULT '1',
  `onboardingComplete` int NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `userId` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `business_snapshots` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `snapshotType` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'day_zero',
  `platformCount` int DEFAULT '0',
  `hoursPerWeek` int DEFAULT '0',
  `totalFollowers` int DEFAULT '0',
  `avgPostReach` int DEFAULT '0',
  `postsPerWeek` int DEFAULT '0',
  `leadsPerWeek` int DEFAULT '0',
  `monthlyRevenue` int DEFAULT '0',
  `blastlyHoursPerWeek` int DEFAULT '0',
  `blastlyLeadsPerWeek` int DEFAULT '0',
  `blastlyPostReach` int DEFAULT '0',
  `notes` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` bigint NOT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `campaigns` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workspaceId` int NOT NULL,
  `createdByUserId` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `promotedUrl` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `goal` enum('awareness','traffic','engagement','conversions','leads') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'awareness',
  `status` enum('draft','active','paused','completed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `utmSource` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `utmMedium` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `utmCampaign` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `startsAt` timestamp NULL DEFAULT NULL,
  `endsAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `channel_connections` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workspaceId` int NOT NULL,
  `channelType` enum('email_gmail','email_outlook','email_imap','sms','google_business','calendar_google','calendar_calendly','calendar_acuity','calendar_simplybook','calendar_square','payment_square','payment_stripe','payment_xero','payment_myob','payment_paypal','payment_shopify') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('connected','pending','skipped','disconnected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `accountName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `accountEmail` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phoneNumber` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `accessToken` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `refreshToken` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tokenExpiresAt` timestamp NULL DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `connectedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `client_monthly_stats` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workspaceId` int NOT NULL,
  `month` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `blogsPublished` int NOT NULL DEFAULT '0',
  `socialPostsPublished` int NOT NULL DEFAULT '0',
  `peopleReached` int NOT NULL DEFAULT '0',
  `callsHandled` int NOT NULL DEFAULT '0',
  `appointmentsBooked` int NOT NULL DEFAULT '0',
  `newEnquiries` int NOT NULL DEFAULT '0',
  `aiCitations` int NOT NULL DEFAULT '0',
  `hoursSaved` int NOT NULL DEFAULT '0',
  `activeFeatures` json DEFAULT (json_array()),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `cms_workspace_month` (`workspaceId`,`month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `competitorMonitors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workspaceId` int NOT NULL,
  `handle` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `platform` enum('twitter','linkedin','facebook','instagram','tiktok','reddit','youtube','pinterest','bluesky') COLLATE utf8mb4_unicode_ci NOT NULL,
  `displayName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `lastCheckedAt` timestamp NULL DEFAULT NULL,
  `createdByUserId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `competitor_scans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `websiteUrl` varchar(2048) COLLATE utf8mb4_unicode_ci NOT NULL,
  `brandName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `industry` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `overallGapScore` int NOT NULL DEFAULT '0',
  `userDigitalScore` int NOT NULL DEFAULT '0',
  `competitors` json DEFAULT NULL,
  `improvementOpportunities` json DEFAULT NULL,
  `quickWins` json DEFAULT NULL,
  `industryBenchmark` json DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `connected_apps` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workspaceId` int NOT NULL,
  `appSlug` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `appName` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `webhookSecret` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `lastEventAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;

CREATE TABLE `contacts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workspaceId` int NOT NULL,
  `firstName` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `lastName` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tags` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `optedOut` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `contentLibrary` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workspaceId` int NOT NULL,
  `type` enum('template','hashtag_set','brand_asset') COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tags` json DEFAULT NULL,
  `assetUrl` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `assetMimeType` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `platforms` json DEFAULT NULL,
  `createdByUserId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `content_assets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workspaceId` int NOT NULL,
  `fileUrl` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `fileKey` varchar(512) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mimeType` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `voiceNoteUrl` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `voiceTranscript` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `aiCaptions` json DEFAULT NULL,
  `selectedPlatforms` json DEFAULT NULL,
  `status` enum('uploading','transcribing','captioning','ready','approved','published','failed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'uploading',
  `publishedPostId` int DEFAULT NULL,
  `scheduledAt` timestamp NULL DEFAULT NULL,
  `createdByUserId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `content_library` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workspaceId` int NOT NULL,
  `createdByUserId` int NOT NULL,
  `type` enum('template','hashtag_set','brand_asset') COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tags` json DEFAULT NULL,
  `assetUrl` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `assetMimeType` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `platforms` json DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `credit_transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workspaceId` int NOT NULL,
  `amount` int NOT NULL,
  `type` enum('purchase','deduct','refund','bonus') COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `stripePaymentIntentId` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `postId` int DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `gift_vouchers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workspaceId` int NOT NULL,
  `code` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amountCents` int NOT NULL,
  `balanceCents` int NOT NULL,
  `issuedByUserId` int NOT NULL,
  `redeemedAt` bigint DEFAULT NULL,
  `expiresAt` bigint DEFAULT NULL,
  `note` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` bigint NOT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `guardian_alerts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `alertType` enum('inappropriate_content','concerning_question','unusual_activity') COLLATE utf8mb4_unicode_ci NOT NULL,
  `contentSnippet` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `severity` enum('low','medium','high') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'medium',
  `guardianNotified` tinyint(1) NOT NULL DEFAULT '0',
  `notifiedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `intelligence_feed_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workspaceId` int NOT NULL,
  `priority` int NOT NULL DEFAULT '6',
  `itemType` enum('appointment_upcoming','appointment_conflict','lead_new','booking_request','message_dm','message_sms','message_email','post_approval','review_negative','traction_post','budget_low','website_suggestion','invoice_paid','competitor_alert') COLLATE utf8mb4_unicode_ci NOT NULL,
  `channel` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `senderName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `senderAvatar` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `messageSnippet` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `aiContextLine` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `aiDraftReply` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `scheduledAt` timestamp NULL DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `status` enum('pending','actioned','dismissed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `actionedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=60001;

CREATE TABLE `learning_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `unitId` int NOT NULL,
  `subjectId` int NOT NULL,
  `status` enum('active','completed','abandoned') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `score` int DEFAULT NULL,
  `pointsEarned` int NOT NULL DEFAULT '0',
  `chatHistory` json DEFAULT NULL,
  `quizAnswers` json DEFAULT NULL,
  `startedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completedAt` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `loyalty_balances` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workspaceId` int NOT NULL,
  `contactId` int NOT NULL,
  `pointsBalance` int NOT NULL DEFAULT '0',
  `totalEarned` int NOT NULL DEFAULT '0',
  `totalRedeemed` int NOT NULL DEFAULT '0',
  `lastSmsSentAt` bigint DEFAULT NULL,
  `createdAt` bigint NOT NULL,
  `updatedAt` bigint NOT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `loyalty_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workspaceId` int NOT NULL,
  `isEnabled` tinyint(1) NOT NULL DEFAULT '0',
  `pointsPerDollar` int NOT NULL DEFAULT '2',
  `dollarsPerPoint` int NOT NULL DEFAULT '10',
  `smsFrequencyDays` int NOT NULL DEFAULT '21',
  `createdAt` bigint NOT NULL,
  `updatedAt` bigint NOT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `workspaceId` (`workspaceId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `multimodalCampaigns` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workspaceId` int NOT NULL,
  `sourceUrl` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `theme` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `brief` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `assets` json DEFAULT NULL,
  `status` enum('generating','ready','scheduled','published') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'generating',
  `agentRunId` int DEFAULT NULL,
  `createdByUserId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workspaceId` int NOT NULL,
  `userId` int NOT NULL,
  `type` enum('post_published','post_failed','post_scheduled','campaign_milestone','team_invite','team_role_changed','member_joined') COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `linkUrl` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isRead` tinyint(1) NOT NULL DEFAULT '0',
  `metadata` json DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `password_reset_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `token` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiresAt` bigint NOT NULL,
  `usedAt` bigint DEFAULT NULL,
  `createdAt` bigint NOT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `password_reset_tokens_token_unique` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `pending_snaps` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sessionToken` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `imageUrl` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `caption` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `hashtags` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `platform` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `websiteUrl` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `published` tinyint NOT NULL DEFAULT '0',
  `publishedAt` bigint DEFAULT NULL,
  `expiresAt` bigint NOT NULL,
  `createdAt` bigint NOT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `pending_snaps_sessionToken_unique` (`sessionToken`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;

CREATE TABLE `platform_connections` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `platform` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('connected','pending','skipped','disconnected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `accountName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `accountId` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `accessToken` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `refreshToken` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tokenExpiresAt` timestamp NULL DEFAULT NULL,
  `connectedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `uq_user_platform` (`userId`,`platform`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `postPlatforms` (
  `id` int NOT NULL AUTO_INCREMENT,
  `postId` int NOT NULL,
  `socialAccountId` int NOT NULL,
  `platform` enum('twitter','linkedin','facebook','instagram','tiktok','reddit','youtube','pinterest','bluesky') COLLATE utf8mb4_unicode_ci NOT NULL,
  `customText` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customHashtags` json DEFAULT NULL,
  `status` enum('pending','published','failed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `platformPostId` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `publishedAt` timestamp NULL DEFAULT NULL,
  `errorMessage` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `post_platforms` (
  `id` int NOT NULL AUTO_INCREMENT,
  `postId` int NOT NULL,
  `socialAccountId` int NOT NULL,
  `platform` enum('twitter','linkedin','facebook','instagram') COLLATE utf8mb4_unicode_ci NOT NULL,
  `customText` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customHashtags` json DEFAULT NULL,
  `platformPostId` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending','published','failed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `errorMessage` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `publishedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `post_queue` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workspaceId` int NOT NULL,
  `type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'client',
  `mediaUrl` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mediaKey` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `caption` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `hashtags` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `platforms` json DEFAULT NULL,
  `scheduledDate` timestamp NULL DEFAULT NULL,
  `isUrgent` tinyint(1) NOT NULL DEFAULT '0',
  `detectedEventName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `detectedPersonName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending_review',
  `agencyNote` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `posts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workspaceId` int NOT NULL,
  `campaignId` int DEFAULT NULL,
  `createdByUserId` int NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bodyText` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mediaUrls` json DEFAULT NULL,
  `hashtags` json DEFAULT NULL,
  `utmSource` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `utmMedium` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `utmCampaign` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `utmContent` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `utmTerm` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `trackedUrl` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('draft','scheduled','published','failed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `scheduledAt` timestamp NULL DEFAULT NULL,
  `publishedAt` timestamp NULL DEFAULT NULL,
  `isTemplate` tinyint(1) NOT NULL DEFAULT '0',
  `templateName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `approvalStatus` enum('draft','pending_agency','pending_client','approved','rejected','scheduled','published') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `agencyNote` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `clientNote` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `previewToken` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `approvedByUserId` int DEFAULT NULL,
  `approvedAt` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;

CREATE TABLE `quick_captures` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workspaceId` int NOT NULL,
  `submittedByUserId` int NOT NULL,
  `mediaUrl` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mediaKey` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mediaType` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `voiceUrl` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `voiceKey` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `voiceTranscript` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `textNote` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `aiGeneratedPosts` json DEFAULT NULL,
  `status` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending_ai',
  `agencyNote` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `quick_charge_transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workspaceId` int NOT NULL,
  `amountCents` int NOT NULL,
  `type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reference` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `note` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` bigint NOT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `reminder_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workspaceId` int NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `reminderDays` json DEFAULT NULL,
  `reminderHour` int DEFAULT '9',
  `lastSentAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `reminder_settings_workspaceId_unique` (`workspaceId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `review_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workspaceId` int NOT NULL,
  `customerName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customerEmail` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customerPhone` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `triggerType` enum('invoice_paid','invoice_sent','job_completed','manual') COLLATE utf8mb4_unicode_ci NOT NULL,
  `channel` enum('sms','email') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'sms',
  `googleReviewUrl` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `messageTemplate` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending','sent','clicked','failed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `sentAt` timestamp NULL DEFAULT NULL,
  `clickedAt` timestamp NULL DEFAULT NULL,
  `externalRef` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `review_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workspaceId` int NOT NULL,
  `autoSendEnabled` tinyint(1) NOT NULL DEFAULT '1',
  `triggerOnInvoicePaid` tinyint(1) NOT NULL DEFAULT '1',
  `triggerOnInvoiceSent` tinyint(1) NOT NULL DEFAULT '0',
  `triggerOnJobCompleted` tinyint(1) NOT NULL DEFAULT '1',
  `preferredChannel` enum('sms','email') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'sms',
  `delayMinutes` int NOT NULL DEFAULT '60',
  `googleReviewUrl` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `smsTemplate` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emailSubject` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emailTemplate` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `review_settings_workspaceId_unique` (`workspaceId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;

CREATE TABLE `roiPredictions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workspaceId` int NOT NULL,
  `campaignId` int DEFAULT NULL,
  `agentRunId` int DEFAULT NULL,
  `predictedTraffic` int DEFAULT NULL,
  `predictedConversions` int DEFAULT NULL,
  `predictedRevenue` int DEFAULT NULL,
  `confidence` int DEFAULT NULL,
  `timeframeDays` int DEFAULT '30',
  `modelInputs` json DEFAULT NULL,
  `actualTraffic` int DEFAULT NULL,
  `actualConversions` int DEFAULT NULL,
  `actualRevenue` int DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `scheduled_posts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workspaceId` int NOT NULL,
  `dueAt` bigint NOT NULL,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `draftContent` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `draftPlatforms` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `approvedAt` bigint DEFAULT NULL,
  `approvedBy` int DEFAULT NULL,
  `reminderSentAt` bigint DEFAULT NULL,
  `ownerNotes` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` bigint NOT NULL,
  `updatedAt` bigint NOT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=180001;

CREATE TABLE `seo_scans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `url` varchar(2048) COLLATE utf8mb4_unicode_ci NOT NULL,
  `score` int NOT NULL DEFAULT '0',
  `title` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `metaDescription` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `h1Tags` json DEFAULT NULL,
  `keywords` json DEFAULT NULL,
  `pageSpeedScore` int DEFAULT NULL,
  `httpsEnabled` tinyint(1) DEFAULT '0',
  `wordCount` int DEFAULT NULL,
  `imagesWithoutAlt` int DEFAULT NULL,
  `internalLinks` int DEFAULT NULL,
  `externalLinks` int DEFAULT NULL,
  `recommendations` json DEFAULT NULL,
  `rawHtml` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `shared_achievements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `achievementId` int NOT NULL,
  `userId` int NOT NULL,
  `token` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `viewCount` int NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `shared_achievements_token_unique` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `shared_reports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `shareToken` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` int DEFAULT NULL,
  `reportType` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `websiteUrl` varchar(512) COLLATE utf8mb4_unicode_ci NOT NULL,
  `overallScore` int DEFAULT NULL,
  `scanData` json NOT NULL,
  `expiresAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `shared_reports_shareToken_unique` (`shareToken`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sms_campaign_recipients` (
  `id` int NOT NULL AUTO_INCREMENT,
  `campaignId` int NOT NULL,
  `contactId` int NOT NULL,
  `phone` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `personalised` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('queued','sent','delivered','failed','opted_out') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'queued',
  `externalRef` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sentAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sms_campaigns` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workspaceId` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `messageTemplate` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `mediaUrl` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tagFilter` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deliveryChannel` enum('sms','social','both') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'sms',
  `status` enum('draft','sending','sent','failed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `totalRecipients` int NOT NULL DEFAULT '0',
  `sentCount` int NOT NULL DEFAULT '0',
  `failedCount` int NOT NULL DEFAULT '0',
  `scheduledAt` timestamp NULL DEFAULT NULL,
  `sentAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `socialAccounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workspaceId` int NOT NULL,
  `userId` int NOT NULL,
  `platform` enum('twitter','linkedin','facebook','instagram','tiktok','reddit','youtube','pinterest','bluesky') COLLATE utf8mb4_unicode_ci NOT NULL,
  `platformAccountId` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `platformUsername` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `platformDisplayName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `platformAvatarUrl` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `accessToken` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `refreshToken` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tokenExpiresAt` timestamp NULL DEFAULT NULL,
  `scopes` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `social_accounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workspaceId` int NOT NULL,
  `userId` int NOT NULL,
  `platform` enum('twitter','linkedin','facebook','instagram') COLLATE utf8mb4_unicode_ci NOT NULL,
  `platformAccountId` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `platformUsername` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `platformDisplayName` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `platformAvatarUrl` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `accessToken` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `refreshToken` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tokenExpiresAt` timestamp NULL DEFAULT NULL,
  `scopes` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `social_scans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `websiteUrl` varchar(2048) COLLATE utf8mb4_unicode_ci NOT NULL,
  `websiteSeoScore` int DEFAULT NULL,
  `overallScore` int NOT NULL DEFAULT '0',
  `discoveredProfiles` json DEFAULT NULL,
  `platformScores` json DEFAULT NULL,
  `recommendations` json DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `social_setup_progress` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workspaceId` int NOT NULL,
  `step1Done` tinyint(1) NOT NULL DEFAULT '0',
  `step2Done` tinyint(1) NOT NULL DEFAULT '0',
  `step3Done` tinyint(1) NOT NULL DEFAULT '0',
  `activeStep` int NOT NULL DEFAULT '1',
  `completedSetups` json DEFAULT NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `social_setup_progress_workspaceId_unique` (`workspaceId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `subjects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `icon` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `planetTheme` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `color` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ageMin` int NOT NULL DEFAULT '5',
  `ageMax` int NOT NULL DEFAULT '19',
  `orderIndex` int NOT NULL DEFAULT '0',
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `subjects_slug_unique` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;

CREATE TABLE `subscriptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `stripeCustomerId` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `stripeSubscriptionId` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `plan` enum('free','starter','pro','agency') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'free',
  `status` enum('active','cancelled','past_due','trialing') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `currentPeriodEnd` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;

CREATE TABLE `trendReports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workspaceId` int NOT NULL,
  `keywords` json DEFAULT NULL,
  `industry` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `insights` json DEFAULT NULL,
  `trendingTopics` json DEFAULT NULL,
  `generatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `units` (
  `id` int NOT NULL AUTO_INCREMENT,
  `subjectId` int NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estimatedMinutes` int NOT NULL DEFAULT '15',
  `orderIndex` int NOT NULL DEFAULT '0',
  `difficulty` enum('beginner','intermediate','advanced') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'beginner',
  `ageMin` int NOT NULL DEFAULT '5',
  `ageMax` int NOT NULL DEFAULT '19',
  `pointsReward` int NOT NULL DEFAULT '50',
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;

CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `openId` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(320) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `loginMethod` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('user','admin') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'user',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `lastSignedIn` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `avatarUrl` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `smsAlertsEnabled` tinyint(1) NOT NULL DEFAULT '1',
  `alertThreshold` enum('all','high') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'all',
  `passwordHash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isEmailVerified` tinyint(1) NOT NULL DEFAULT '0',
  `welcomeCompleted` tinyint(1) NOT NULL DEFAULT '0',
  `businessName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `industrySlug` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `users_openId_unique` (`openId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=4320001;

CREATE TABLE `video_projects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workspaceId` int NOT NULL,
  `userId` int NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `platform` enum('tiktok','youtube','instagram','facebook','twitter','linkedin') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'tiktok',
  `format` enum('short','long','reel','story') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'short',
  `status` enum('draft','generating','ready','published') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `prompt` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `script` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `voiceoverUrl` varchar(1024) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `videoUrl` varchar(1024) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `thumbnailUrl` varchar(1024) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `durationSeconds` int DEFAULT NULL,
  `captions` json DEFAULT NULL,
  `hashtags` json DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_workspace` (`workspaceId`),
  KEY `idx_user` (`userId`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=60001;

CREATE TABLE `viralityScores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workspaceId` int NOT NULL,
  `postId` int DEFAULT NULL,
  `contentHash` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `platform` enum('twitter','linkedin','facebook','instagram','tiktok','reddit','youtube','pinterest','bluesky') COLLATE utf8mb4_unicode_ci NOT NULL,
  `score` int NOT NULL,
  `confidence` int NOT NULL,
  `suggestions` json DEFAULT NULL,
  `algorithmFactors` json DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `voucher_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workspaceId` int NOT NULL,
  `defaultExpiryDays` int NOT NULL DEFAULT '365',
  `minAmountCents` int NOT NULL DEFAULT '500',
  `maxAmountCents` int NOT NULL DEFAULT '50000',
  `prefix` varchar(8) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'GV',
  `createdAt` bigint NOT NULL,
  `updatedAt` bigint NOT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `voucher_settings_workspaceId_unique` (`workspaceId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `wallet_transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workspaceId` int NOT NULL,
  `type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amountCents` int NOT NULL,
  `balanceAfterCents` int NOT NULL,
  `description` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `stripePaymentIntentId` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `webhook_events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `connectedAppId` int NOT NULL,
  `workspaceId` int NOT NULL,
  `eventType` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` json NOT NULL,
  `status` enum('pending','done','error') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `errorMessage` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `generatedPostIds` json DEFAULT NULL,
  `processedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;

CREATE TABLE `websiteAnalyses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workspaceId` int NOT NULL,
  `url` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `pageTitle` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `extractedData` json DEFAULT NULL,
  `lastAnalyzedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `workspaceMembers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workspaceId` int NOT NULL,
  `userId` int NOT NULL,
  `role` enum('admin','editor','viewer') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'viewer',
  `invitedByUserId` int DEFAULT NULL,
  `joinedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `workspace_members` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workspaceId` int NOT NULL,
  `userId` int NOT NULL,
  `role` enum('admin','editor','viewer') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'viewer',
  `invitedByUserId` int DEFAULT NULL,
  `inviteEmail` varchar(320) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending','active','revoked') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `workspace_preferences` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workspaceId` int NOT NULL,
  `colorScheme` enum('bold','soft','warm') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'bold',
  `homeMode` enum('dashboard','assistant') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'dashboard',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `workspace_preferences_workspaceId_unique` (`workspaceId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=60001;

CREATE TABLE `workspaces` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `logoUrl` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ownerId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `website` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `industry` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `primaryColor` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `secondaryColor` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `toneOfVoice` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `targetAudience` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `planTier` enum('free','fix_my_brand','managed_social') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'free',
  `stripeCustomerId` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `stripeSubscriptionId` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subscriptionStatus` enum('active','cancelled','past_due','trialing','none') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'none',
  `trialEndsAt` timestamp NULL DEFAULT NULL,
  `ayrshareProfileKey` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `setupFeePaid` tinyint(1) NOT NULL DEFAULT '0',
  `creditsBalance` int NOT NULL DEFAULT '0',
  `selectedPlatforms` json DEFAULT NULL,
  `onboardingStep` int NOT NULL DEFAULT '0',
  `onboardingComplete` tinyint(1) NOT NULL DEFAULT '0',
  `googleReviewUrl` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tagline` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `geographicReach` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `locationCity` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `locationState` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `locationCountry` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `industries` json DEFAULT NULL,
  `otherIndustry` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ageRanges` json DEFAULT NULL,
  `contactEmail` varchar(320) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contactMobile` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `workspaces_slug_unique` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=210001;

SET FOREIGN_KEY_CHECKS=1;
