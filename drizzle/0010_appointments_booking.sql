-- Drop old appointments table (no real data yet — schema was just scaffolded)
DROP TABLE IF EXISTS appointments;

-- Appointment Services (service menu)
CREATE TABLE IF NOT EXISTS appointment_services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workspaceId INT NOT NULL,
  name VARCHAR(128) NOT NULL,
  durationMinutes INT NOT NULL DEFAULT 30,
  priceCents INT NOT NULL DEFAULT 0,
  description TEXT,
  color VARCHAR(16) DEFAULT '#6366f1',
  isActive BOOLEAN NOT NULL DEFAULT TRUE,
  createdAt BIGINT NOT NULL,
  updatedAt BIGINT NOT NULL
);

-- Appointments (full schema)
CREATE TABLE IF NOT EXISTS appointments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workspaceId INT NOT NULL,
  contactId INT,
  serviceId INT,
  title VARCHAR(256) NOT NULL,
  clientName VARCHAR(128),
  clientPhone VARCHAR(32),
  clientEmail VARCHAR(256),
  startAt BIGINT NOT NULL,
  endAt BIGINT NOT NULL,
  notes TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'confirmed',
  paymentMethod VARCHAR(32),
  amountCents INT,
  loyaltyPointsEarned INT DEFAULT 0,
  loyaltyPointsRedeemed INT DEFAULT 0,
  confirmationSent BOOLEAN NOT NULL DEFAULT FALSE,
  reminder24Sent BOOLEAN NOT NULL DEFAULT FALSE,
  reminder2Sent BOOLEAN NOT NULL DEFAULT FALSE,
  reviewSent BOOLEAN NOT NULL DEFAULT FALSE,
  bookingToken VARCHAR(64),
  source VARCHAR(32) DEFAULT 'manual',
  createdAt BIGINT NOT NULL,
  updatedAt BIGINT NOT NULL
);

-- Loyalty Settings
CREATE TABLE IF NOT EXISTS loyalty_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workspaceId INT NOT NULL UNIQUE,
  isEnabled BOOLEAN NOT NULL DEFAULT FALSE,
  pointsPerDollar INT NOT NULL DEFAULT 2,
  dollarsPerPoint INT NOT NULL DEFAULT 10,
  smsFrequencyDays INT NOT NULL DEFAULT 21,
  createdAt BIGINT NOT NULL,
  updatedAt BIGINT NOT NULL
);

-- Loyalty Balances
CREATE TABLE IF NOT EXISTS loyalty_balances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workspaceId INT NOT NULL,
  contactId INT NOT NULL,
  pointsBalance INT NOT NULL DEFAULT 0,
  totalEarned INT NOT NULL DEFAULT 0,
  totalRedeemed INT NOT NULL DEFAULT 0,
  lastSmsSentAt BIGINT,
  createdAt BIGINT NOT NULL,
  updatedAt BIGINT NOT NULL
);

-- Booking Portal Settings
CREATE TABLE IF NOT EXISTS booking_portal_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workspaceId INT NOT NULL UNIQUE,
  isEnabled BOOLEAN NOT NULL DEFAULT FALSE,
  slug VARCHAR(64) UNIQUE,
  welcomeMessage TEXT,
  businessHours TEXT,
  bufferMinutes INT NOT NULL DEFAULT 15,
  maxDaysAhead INT NOT NULL DEFAULT 30,
  createdAt BIGINT NOT NULL,
  updatedAt BIGINT NOT NULL
);

-- Appointment Reminder Templates
CREATE TABLE IF NOT EXISTS appointment_reminder_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workspaceId INT NOT NULL UNIQUE,
  confirmationSms TEXT,
  reminder24Sms TEXT,
  reminder2Sms TEXT,
  reviewSms TEXT,
  confirmationEmail TEXT,
  createdAt BIGINT NOT NULL,
  updatedAt BIGINT NOT NULL
);
