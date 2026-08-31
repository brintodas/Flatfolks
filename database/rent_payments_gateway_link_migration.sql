-- ============================================================
-- Migration: link rent_payments to the payment gateway
-- SAFE / IDEMPOTENT — can be run multiple times.
-- Run AFTER payments_schema.sql
-- ============================================================
SET @db := DATABASE();

-- rent_payments.payment_id — traces a revenue-log row back to the
-- exact `payments` transaction that created it (NULL for rows the
-- landlord recorded manually, e.g. a cash payment)
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'rent_payments' AND COLUMN_NAME = 'payment_id');
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `rent_payments` ADD COLUMN `payment_id` int(11) DEFAULT NULL AFTER `amount`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- rent_payments.payment_method — 'bkash' / 'nagad' / 'card' / 'bank' from
-- SSLCommerz, or 'cash' when the landlord recorded it manually. This is
-- what the dashboard's "Payments by Method" chart groups on.
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'rent_payments' AND COLUMN_NAME = 'payment_method');
SET @sql := IF(@col_exists = 0,
  "ALTER TABLE `rent_payments` ADD COLUMN `payment_method` varchar(50) DEFAULT 'cash' AFTER `payment_id`",
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @key_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'rent_payments' AND INDEX_NAME = 'payment_id');
SET @sql := IF(@key_exists = 0,
  'ALTER TABLE `rent_payments` ADD KEY `payment_id` (`payment_id`)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'rent_payments' AND CONSTRAINT_NAME = 'rent_payments_payment_fk');
SET @sql := IF(@fk_exists = 0,
  'ALTER TABLE `rent_payments` ADD CONSTRAINT `rent_payments_payment_fk` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE SET NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;