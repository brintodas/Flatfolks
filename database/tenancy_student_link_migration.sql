-- ============================================================
-- Migration: link tenancies to the actual student user account
-- SAFE / IDEMPOTENT — can be run multiple times.
-- Needed so a logged-in student can find "my rent" to pay through
-- the gateway, without this there is no query that connects a
-- tenancies row back to users.id for the tenant side.
-- Run AFTER payments_schema.sql
-- ============================================================
SET @db := DATABASE();

SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'tenancies' AND COLUMN_NAME = 'tenant_user_id');
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `tenancies` ADD COLUMN `tenant_user_id` int(11) DEFAULT NULL AFTER `tenant_phone`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @key_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'tenancies' AND INDEX_NAME = 'tenant_user_id');
SET @sql := IF(@key_exists = 0,
  'ALTER TABLE `tenancies` ADD KEY `tenant_user_id` (`tenant_user_id`)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'tenancies' AND CONSTRAINT_NAME = 'tenancies_tenant_user_fk');
SET @sql := IF(@fk_exists = 0,
  'ALTER TABLE `tenancies` ADD CONSTRAINT `tenancies_tenant_user_fk` FOREIGN KEY (`tenant_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Best-effort backfill: match existing tenancies to a student account
-- by phone number, where one exists. Anything left NULL just means the
-- landlord will need to re-link it (or a student links it themselves
-- the first time they open the Payments page, see routes/landlord.js).
UPDATE `tenancies` t
JOIN `users` u ON u.phone = t.tenant_phone AND u.role = 'student'
SET t.tenant_user_id = u.id
WHERE t.tenant_user_id IS NULL;