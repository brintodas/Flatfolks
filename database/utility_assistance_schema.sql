-- FlatFolks: Utility Connection Assistance Module

CREATE TABLE IF NOT EXISTS `utility_assistance_requests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT DEFAULT NULL,
  `student_name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `property_address` VARCHAR(255) NOT NULL,

  `gas_required` TINYINT(1) NOT NULL DEFAULT 0,
  `electricity_required` TINYINT(1) NOT NULL DEFAULT 0,
  `water_required` TINYINT(1) NOT NULL DEFAULT 0,
  `wifi_required` TINYINT(1) NOT NULL DEFAULT 0,

  `move_in_date` DATE NOT NULL,
  `additional_notes` TEXT DEFAULT NULL,

  `status` ENUM(
    'PENDING',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
  ) NOT NULL DEFAULT 'PENDING',

  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;