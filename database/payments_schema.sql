-- ============================================================
-- FlatFolks: Centralized Payment Gateway Module
-- Run AFTER schema.sql, landlord_features_migration.sql
-- (needs `users` and `tenancies` tables to exist)
-- ============================================================

-- ----------------------------------------------------------------
-- payments
-- One row per attempted transaction through the payment gateway,
-- regardless of what it's paying for (rent, maintenance, utility
-- assistance, shared bills, etc). `service_type` + `reference_id`
-- tell the backend which table to update on success.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payments` (
  `id`               int(11) NOT NULL AUTO_INCREMENT,
  `payer_id`         int(11) DEFAULT NULL,
  `payee_id`         int(11) DEFAULT NULL,
  `service_type`     enum('rent', 'maintenance', 'utility_assistance', 'shared_bill', 'other') NOT NULL,
  `reference_id`     int(11) DEFAULT NULL COMMENT 'id in the related table: tenancies.id for rent, service_requests.id for maintenance, etc.',
  `amount`           decimal(10,2) NOT NULL,
  `currency`         varchar(10) NOT NULL DEFAULT 'BDT',
  `gateway`          varchar(30) NOT NULL DEFAULT 'sslcommerz',
  `tran_id`          varchar(100) NOT NULL COMMENT 'our unique transaction id, sent to SSLCommerz',
  `val_id`           varchar(100) DEFAULT NULL COMMENT 'SSLCommerz validation id, returned after successful payment',
  `payment_method`   varchar(50) DEFAULT NULL COMMENT 'card / bkash / nagad / bank, as reported back by SSLCommerz',
  `status`           enum('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  `payer_name`       varchar(150) DEFAULT NULL,
  `payer_email`      varchar(150) DEFAULT NULL,
  `payer_phone`      varchar(20) DEFAULT NULL,
  `description`      varchar(255) DEFAULT NULL,
  `gateway_response` text DEFAULT NULL COMMENT 'raw JSON from SSLCommerz, kept for audit/debugging',
  `created_at`       timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at`       timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_tran_id` (`tran_id`),
  KEY `idx_payer` (`payer_id`),
  KEY `idx_payee` (`payee_id`),
  KEY `idx_service_ref` (`service_type`, `reference_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_payment_payer` FOREIGN KEY (`payer_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_payment_payee` FOREIGN KEY (`payee_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------------------------------------------
-- notifications
-- Generic in-app notification inbox, polled by the frontend
-- (matches the existing polling pattern already used in Navbar.jsx
-- for roommate invites). Used here to alert landlords instantly
-- when a rent payment clears.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notifications` (
  `id`           int(11) NOT NULL AUTO_INCREMENT,
  `user_id`      int(11) NOT NULL COMMENT 'recipient',
  `type`         enum('payment_received', 'payment_sent', 'payment_failed', 'system') NOT NULL DEFAULT 'system',
  `title`        varchar(150) NOT NULL,
  `message`      varchar(500) DEFAULT NULL,
  `related_type` varchar(50) DEFAULT NULL COMMENT 'e.g. "payment", "tenancy"',
  `related_id`   int(11) DEFAULT NULL,
  `is_read`      tinyint(1) NOT NULL DEFAULT 0,
  `created_at`   timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_unread` (`user_id`, `is_read`),
  CONSTRAINT `fk_notif_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;