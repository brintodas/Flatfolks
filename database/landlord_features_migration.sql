-- ============================================================
-- Migration: Landlord Profile, Public Profile & Multi-Property
--            Dashboard feature
-- SAFE / IDEMPOTENT VERSION — can be run multiple times without
-- throwing "duplicate column" or "table already exists" errors.
-- Run this AFTER your existing schema.sql / seed_data.sql
-- ============================================================

-- Use a session variable to hold the current DB name so the
-- information_schema checks below work regardless of DB name.
SET @db := DATABASE();

-- ------------------------------------------------------------
-- 1. Extend `users` with landlord business + verification fields
-- ------------------------------------------------------------

SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' AND COLUMN_NAME = 'business_name');
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `users` ADD COLUMN `business_name` varchar(150) DEFAULT NULL AFTER `current_address`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' AND COLUMN_NAME = 'business_type');
SET @sql := IF(@col_exists = 0,
  "ALTER TABLE `users` ADD COLUMN `business_type` enum('individual','company') DEFAULT 'individual' AFTER `business_name`",
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' AND COLUMN_NAME = 'bio');
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `users` ADD COLUMN `bio` text DEFAULT NULL AFTER `business_type`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' AND COLUMN_NAME = 'profile_picture');
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `users` ADD COLUMN `profile_picture` varchar(255) DEFAULT NULL AFTER `bio`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' AND COLUMN_NAME = 'verification_doc');
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `users` ADD COLUMN `verification_doc` varchar(255) DEFAULT NULL AFTER `profile_picture`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' AND COLUMN_NAME = 'verification_status');
SET @sql := IF(@col_exists = 0,
  "ALTER TABLE `users` ADD COLUMN `verification_status` enum('none','pending','approved','rejected') DEFAULT 'none' AFTER `verification_doc`",
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- 2. Link listings to the landlord's real account + grouping
-- ------------------------------------------------------------

SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'listings' AND COLUMN_NAME = 'landlord_id');
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `listings` ADD COLUMN `landlord_id` int(11) DEFAULT NULL AFTER `id`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'listings' AND COLUMN_NAME = 'property_group');
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `listings` ADD COLUMN `property_group` varchar(150) DEFAULT NULL AFTER `landlord_phone`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @key_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'listings' AND INDEX_NAME = 'landlord_id');
SET @sql := IF(@key_exists = 0,
  'ALTER TABLE `listings` ADD KEY `landlord_id` (`landlord_id`)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'listings' AND CONSTRAINT_NAME = 'listings_landlord_fk');
SET @sql := IF(@fk_exists = 0,
  'ALTER TABLE `listings` ADD CONSTRAINT `listings_landlord_fk` FOREIGN KEY (`landlord_id`) REFERENCES `users` (`id`) ON DELETE SET NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- 3. Reviews students leave for a landlord
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `landlord_reviews` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `landlord_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `listing_id` int(11) DEFAULT NULL,
  `rating` tinyint(1) NOT NULL,
  `comment` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `landlord_id` (`landlord_id`),
  CONSTRAINT `landlord_reviews_ibfk_1` FOREIGN KEY (`landlord_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `landlord_reviews_ibfk_2` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ------------------------------------------------------------
-- 4. Tenancies — who currently occupies a unit
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `tenancies` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `listing_id` int(11) NOT NULL,
  `landlord_id` int(11) NOT NULL,
  `tenant_name` varchar(150) NOT NULL,
  `tenant_phone` varchar(20) DEFAULT NULL,
  `tenant_user_id` int(11) DEFAULT NULL,
  `rent_amount` int(11) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `status` enum('active','ended') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `listing_id` (`listing_id`),
  KEY `landlord_id` (`landlord_id`),
  CONSTRAINT `tenancies_ibfk_1` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tenancies_ibfk_2` FOREIGN KEY (`landlord_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ------------------------------------------------------------
-- 5. Rent payments — feeds the monthly revenue line graph
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `rent_payments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenancy_id` int(11) NOT NULL,
  `landlord_id` int(11) NOT NULL,
  `amount` int(11) NOT NULL,
  `payment_month` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `tenancy_id` (`tenancy_id`),
  KEY `landlord_id` (`landlord_id`),
  CONSTRAINT `rent_payments_ibfk_1` FOREIGN KEY (`tenancy_id`) REFERENCES `tenancies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `rent_payments_ibfk_2` FOREIGN KEY (`landlord_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ------------------------------------------------------------
-- 6. Viewing requests
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `viewing_requests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `listing_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `landlord_id` int(11) NOT NULL,
  `requested_date` date DEFAULT NULL,
  `message` text DEFAULT NULL,
  `status` enum('pending','approved','declined') DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `listing_id` (`listing_id`),
  KEY `landlord_id` (`landlord_id`),
  CONSTRAINT `viewing_requests_ibfk_1` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `viewing_requests_ibfk_2` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `viewing_requests_ibfk_3` FOREIGN KEY (`landlord_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;