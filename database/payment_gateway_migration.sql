-- ============================================================
-- Migration: Full Payment Gateway Wiring — FlatFolks
-- SAFE / IDEMPOTENT — can be run multiple times without errors.
-- Run AFTER: schema.sql, landlord_features_migration.sql,
--            payments_schema.sql
-- ============================================================

SET @db := DATABASE();

-- ─── 1. Extend `tenancies`.status to include 'pending_payment' ───────────────
-- Before approval the landlord creates a tenancy; we now keep it in
-- 'pending_payment' state until the student pays the advance deposit.
-- Only then does it flip to 'active' and the listing becomes 'inactive'.

SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'tenancies' AND COLUMN_NAME = 'status');
SET @sql := IF(@col_exists > 0,
  "ALTER TABLE `tenancies` MODIFY COLUMN `status` ENUM('active','ended','pending_payment') NOT NULL DEFAULT 'active'",
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Diagnostic only (not an automatic repair — we don't have the landlord.js
-- insert code here to confirm what the original intended status was for any
-- corrupted row). If this returns > 0, the same silent-enum-truncation bug
-- hit `tenancies` before this migration ran, and those rows most likely
-- should be 'pending_payment'. Check them manually, e.g.:
--   SELECT id, listing_id, tenant_name, status FROM tenancies WHERE status = '';
SELECT COUNT(*) AS tenancies_with_blank_status FROM `tenancies` WHERE `status` = '';

-- ─── 2. Extend `service_requests`.status to include 'PENDING_PAYMENT' ────────
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'service_requests' AND COLUMN_NAME = 'status');
SET @sql := IF(@col_exists > 0,
  "ALTER TABLE `service_requests` MODIFY COLUMN `status` ENUM('PENDING_PAYMENT','CONFIRMED','IN_PROGRESS','DONE','CANCELLED') NOT NULL DEFAULT 'PENDING_PAYMENT'",
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ─── 2b. Repair rows corrupted BEFORE this migration ran ─────────────────────
-- Before this ALTER, `status` was ENUM('PENDING','CONFIRMED','IN_PROGRESS',
-- 'COMPLETED','CANCELLED') — it had no 'PENDING_PAYMENT' member. Every booking
-- the app inserted with status = 'PENDING_PAYMENT' would have been silently
-- stored as '' (empty string) by MySQL/MariaDB instead of erroring. Those rows
-- are the "ghost tickets": they show up unconfirmed in the maintenance log
-- (status != 'PENDING_PAYMENT' matches '') but never appeared in Due Payments
-- (status = 'PENDING_PAYMENT' does not match ''), so they were unpayable.
-- The app never writes any other value that could land here, so it's safe to
-- reclaim every '' row as 'PENDING_PAYMENT'.
UPDATE `service_requests` SET `status` = 'PENDING_PAYMENT' WHERE `status` = '';

-- ─── 3. Extend `payments`.service_type to include 'advance_payment' ──────────
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'service_type');
SET @sql := IF(@col_exists > 0,
  "ALTER TABLE `payments` MODIFY COLUMN `service_type` ENUM('rent','advance_payment','maintenance','utility_assistance','shared_bill','other') NOT NULL",
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Diagnostic only — same reasoning as the tenancies check above.
SELECT COUNT(*) AS payments_with_blank_service_type FROM `payments` WHERE `service_type` = '';

-- ─── 4. Fix `notifications`.type to include payment types ────────────────────
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'type');
SET @sql := IF(@col_exists > 0,
  "ALTER TABLE `notifications` MODIFY COLUMN `type` ENUM('payment_received','payment_sent','payment_failed','advance_payment','maintenance_payment','system') NOT NULL DEFAULT 'system'",
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ─── 5. Ensure `notifications` has `message` column (not just `body`) ────────
-- landlord.js was incorrectly inserting into `body`; the schema defines `message`.
-- This makes sure `message` exists. If only `body` exists, we rename it.
SET @has_message := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'message');
SET @has_body := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'body');

-- If body exists but message doesn't, rename it
SET @sql := IF(@has_message = 0 AND @has_body > 0,
  'ALTER TABLE `notifications` CHANGE `body` `message` varchar(500) DEFAULT NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- If neither exists, add message
SET @has_message2 := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'message');
SET @sql := IF(@has_message2 = 0,
  'ALTER TABLE `notifications` ADD COLUMN `message` varchar(500) DEFAULT NULL AFTER `title`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ─── 6. Ensure `notifications` has `related_type` and `related_id` ───────────
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'related_type');
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `notifications` ADD COLUMN `related_type` varchar(50) DEFAULT NULL AFTER `message`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'related_id');
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `notifications` ADD COLUMN `related_id` int(11) DEFAULT NULL AFTER `related_type`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ─── 7. Ensure `notifications` has `is_read` ─────────────────────────────────
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'is_read');
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `notifications` ADD COLUMN `is_read` tinyint(1) NOT NULL DEFAULT 0 AFTER `related_id`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;