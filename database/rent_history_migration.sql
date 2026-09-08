-- ============================================================
-- Migration: Listing Rent Change History
-- Lets a landlord edit a listing's monthly rent, and keeps a log
-- of every change so students can see the rent history on the
-- listing detail page.
-- SAFE / IDEMPOTENT — can be run multiple times without errors.
-- Run this AFTER schema.sql
-- ============================================================
CREATE TABLE IF NOT EXISTS `listing_rent_history` (
  `id`          int(11) NOT NULL AUTO_INCREMENT,
  `listing_id`  int(11) NOT NULL,
  `old_rent`    int(11) NOT NULL,
  `new_rent`    int(11) NOT NULL,
  `changed_by`  int(11) DEFAULT NULL COMMENT 'landlord user id who made the change',
  `changed_at`  timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_listing` (`listing_id`),
  KEY `idx_changed_by` (`changed_by`),
  CONSTRAINT `rent_history_listing_fk` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `rent_history_user_fk` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;