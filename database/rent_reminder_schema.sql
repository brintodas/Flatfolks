-- ─────────────────────────────────────────────────────────────
-- Flatfolks: Rent Reminder & In-App Notifications Schema
-- Run once against the `flatfolks` database
-- ─────────────────────────────────────────────────────────────

-- Table: rent_reminders
-- Stores each student's monthly rent due-day preference.
-- One row per student (enforced by UNIQUE user_id).
CREATE TABLE IF NOT EXISTS `rent_reminders` (
  `id`           INT(11)       NOT NULL AUTO_INCREMENT,
  `user_id`      INT(11)       NOT NULL,
  `due_day`      TINYINT(2)    NOT NULL COMMENT 'Day of the month rent is due (1-31)',
  `rent_amount`  DECIMAL(10,2) DEFAULT NULL COMMENT 'Optional: shown in reminder message',
  `is_active`    TINYINT(1)    NOT NULL DEFAULT 1,
  `created_at`   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_reminder` (`user_id`),
  CONSTRAINT `rent_reminders_ibfk_1`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: notifications
-- Generic in-app notification store. Reusable for other features.
CREATE TABLE IF NOT EXISTS `notifications` (
  `id`         INT(11)      NOT NULL AUTO_INCREMENT,
  `user_id`    INT(11)      NOT NULL,
  `type`       VARCHAR(60)  NOT NULL COMMENT 'e.g. rent_reminder_7d, rent_reminder_3d, rent_reminder_1d',
  `title`      VARCHAR(200) NOT NULL,
  `body`       TEXT         DEFAULT NULL,
  `is_read`    TINYINT(1)   NOT NULL DEFAULT 0,
  `due_date`   DATE         DEFAULT NULL COMMENT 'The rent due date this notification is for (used for dedup)',
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  -- Prevent duplicate notifications for the same user / reminder-type / due-date cycle
  UNIQUE KEY `uq_notif_dedup` (`user_id`, `type`, `due_date`),
  KEY `idx_user_read` (`user_id`, `is_read`),
  CONSTRAINT `notifications_ibfk_1`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
