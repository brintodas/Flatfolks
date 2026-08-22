-- ============================================================
-- Shared Bills & Roommate Expense Tracker — Database Schema
-- Run AFTER schema.sql and roommate_groups.sql
-- ============================================================

-- ----------------------------------------------------------------
-- expenses
-- Tracks total expense amount, payer (nullable for pending bills), group, and category.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `expenses` (
  `id`           int(11) NOT NULL AUTO_INCREMENT,
  `group_id`     int(11) NOT NULL,
  `payer_id`     int(11) DEFAULT NULL,
  `title`        varchar(255) NOT NULL,
  `amount`       decimal(10,2) NOT NULL,
  `category`     enum('rent', 'electricity', 'wifi', 'groceries', 'water_gas', 'maid', 'maintenance', 'other') NOT NULL DEFAULT 'other',
  `split_type`   enum('EQUAL', 'EXACT', 'PERCENTAGE') NOT NULL DEFAULT 'EQUAL',
  `notes`        text DEFAULT NULL,
  `receipt_url`  varchar(255) DEFAULT NULL,
  `expense_date` date NOT NULL,
  `created_at`   timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at`   timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_group` (`group_id`),
  KEY `idx_payer` (`payer_id`),
  KEY `idx_date` (`expense_date`),
  CONSTRAINT `fk_exp_group` FOREIGN KEY (`group_id`) REFERENCES `roommate_groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_exp_payer` FOREIGN KEY (`payer_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------------------------------------------
-- expense_splits
-- Tracks individual member shares for each expense.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `expense_splits` (
  `id`           int(11) NOT NULL AUTO_INCREMENT,
  `expense_id`   int(11) NOT NULL,
  `user_id`      int(11) NOT NULL,
  `amount_owed`  decimal(10,2) NOT NULL,
  `percentage`   decimal(5,2) DEFAULT NULL,
  `is_settled`   tinyint(1) NOT NULL DEFAULT 0,
  `created_at`   timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_expense` (`expense_id`),
  KEY `idx_user` (`user_id`),
  CONSTRAINT `fk_split_expense` FOREIGN KEY (`expense_id`) REFERENCES `expenses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_split_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------------------------------------------
-- settlements
-- Tracks recorded settlement payments between two group members.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `settlements` (
  `id`             int(11) NOT NULL AUTO_INCREMENT,
  `group_id`       int(11) NOT NULL,
  `payer_id`       int(11) NOT NULL,
  `receiver_id`    int(11) NOT NULL,
  `amount`         decimal(10,2) NOT NULL,
  `payment_method` enum('bkash', 'nagad', 'bank', 'cash', 'other') NOT NULL DEFAULT 'bkash',
  `notes`          varchar(255) DEFAULT NULL,
  `settled_at`     timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_settle_group` (`group_id`),
  KEY `idx_settle_payer` (`payer_id`),
  KEY `idx_settle_receiver` (`receiver_id`),
  CONSTRAINT `fk_settle_group` FOREIGN KEY (`group_id`) REFERENCES `roommate_groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_settle_payer` FOREIGN KEY (`payer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_settle_receiver` FOREIGN KEY (`receiver_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
