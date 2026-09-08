-- ============================================================
-- Migration: wire Meal Plan Subscriptions into the payment gateway
-- SAFE / IDEMPOTENT — can be run multiple times without errors.
-- Run AFTER: payments_schema.sql, meal_plans_schema.sql
-- ============================================================
SET @db := DATABASE();

-- payments.service_type must accept 'meal_subscription' or every insert
-- with that value gets silently stored as '' (MySQL/MariaDB's behaviour
-- for an out-of-range ENUM in non-strict mode) — the exact bug that hit
-- service_requests.status before payment_gateway_migration.sql. Widening
-- the enum here up front avoids repeating that.
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'service_type');
SET @sql := IF(@col_exists > 0,
  "ALTER TABLE `payments` MODIFY COLUMN `service_type` ENUM('rent','advance_payment','maintenance','utility_assistance','shared_bill','meal_subscription','other') NOT NULL",
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Diagnostic only — see if this enum was already silently corrupted by an
-- older meal_subscription payment attempt made before this migration ran.
SELECT COUNT(*) AS payments_with_blank_service_type FROM `payments` WHERE `service_type` = '';