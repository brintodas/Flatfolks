-- ============================================================
-- Migration: Add living space / apartment registration fields
-- ============================================================
ALTER TABLE `roommate_groups`
  ADD COLUMN IF NOT EXISTS `address` VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `area` VARCHAR(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `monthly_rent` DECIMAL(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `bedrooms` INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `bathrooms` INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `kitchens` INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS `size_sqft` INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `contact_phone` VARCHAR(20) DEFAULT NULL;
