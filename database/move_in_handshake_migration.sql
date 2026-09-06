-- ============================================================
-- Move-In Handshake Migration
-- Adds notes + applicant fields to viewing_requests
-- SAFE / IDEMPOTENT
-- ============================================================
SET @db := DATABASE();

-- Add notes column (student's cover message on application)
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'viewing_requests' AND COLUMN_NAME = 'notes');
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `viewing_requests` ADD COLUMN `notes` text DEFAULT NULL AFTER `message`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add move_in_date column
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'viewing_requests' AND COLUMN_NAME = 'move_in_date');
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `viewing_requests` ADD COLUMN `move_in_date` date DEFAULT NULL AFTER `notes`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Prevent duplicate applications per student per listing
SET @key_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'viewing_requests' AND INDEX_NAME = 'uq_student_listing');
SET @sql := IF(@key_exists = 0,
  'ALTER TABLE `viewing_requests` ADD UNIQUE KEY `uq_student_listing` (`student_id`, `listing_id`)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
