-- ============================================================
-- FlatFolks: Service & Maintenance Module Schema
-- ============================================================

-- 1. Service Categories Table
CREATE TABLE IF NOT EXISTS `service_categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `slug` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `icon` VARCHAR(50) DEFAULT 'fa-solid fa-wrench',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Services Catalog Table
CREATE TABLE IF NOT EXISTS `services` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `category_id` INT NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `estimated_cost` DECIMAL(10,2) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`category_id`) REFERENCES `service_categories`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Technicians Table (Filtered by Area & Category)
CREATE TABLE IF NOT EXISTS `technicians` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `service_category_id` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `area` VARCHAR(80) NOT NULL,
  `rating` DECIMAL(2,1) DEFAULT 5.0,
  `is_available` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_tech_area_cat` (`area`, `service_category_id`),
  FOREIGN KEY (`service_category_id`) REFERENCES `service_categories`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Service Requests (Shared Apartment Maintenance Log)
CREATE TABLE IF NOT EXISTS `service_requests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `apartment_id` INT NOT NULL,
  `requested_by_user_id` INT NOT NULL,
  `service_id` INT NOT NULL,
  `technician_id` INT NOT NULL,
  `scheduled_date` DATE NOT NULL,
  `time_slot` ENUM(
    'জোহরের আগে',
    'জোহরের পরে',
    'আসরের আগে',
    'আসরের পরে',
    'মাগরিবের আগে',
    'মাগরিবের পরে',
    'এশার আগে',
    'এশার পরে'
  ) NOT NULL,
  `problem_description` TEXT DEFAULT NULL,
  `status` ENUM('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'CONFIRMED',
  `cost` DECIMAL(10,2) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_apartment_log` (`apartment_id`, `created_at`),
  FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`technician_id`) REFERENCES `technicians`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed Categories
INSERT INTO `service_categories` (`id`, `slug`, `name`, `icon`) VALUES
(1, 'electrician', 'Electrician', 'fa-bolt'),
(2, 'plumber', 'Plumber', 'fa-faucet-drip'),
(3, 'gas_technician', 'Gas Technician', 'fa-fire-burner'),
(4, 'handyman', 'Handyman', 'fa-screwdriver-wrench')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Seed Services
INSERT INTO `services` (`category_id`, `name`, `description`) VALUES
-- Electrician
(1, 'General Electrical', 'Wiring, switchboard, ceiling fan & light fixes'),
(1, 'AC Servicing & Gas Refill', 'Filter cleaning, cooling coils & refrigerant refill'),
(1, 'Fridge & Microwave Repair', 'Cooling troubleshooting and electrical repair'),
-- Plumber
(2, 'Pipe & Tap Leaks', 'Sink water leaks, pipeline repair & valve replacement'),
(2, 'Bathroom Fittings', 'Commode, shower head, faucet, and hand spray setup'),
(2, 'Water Filter Setup', 'RO / UV water purifier wall installation and inlet fitting'),
-- Gas Technician
(3, 'Gas Stove Repair', 'Burner cleaning, flame issues & gas leak check'),
(3, 'LPG Cylinder Check & Setup', 'Regulator fitting, hose pipe check and safe installation'),
-- Handyman
(4, 'Locksmith & Key Duplication', 'Door lock change, handle fix, and key cutting'),
(4, 'Basic Carpentry/Drilling', 'Curtain rod, mirror, shelf hanging and bed repair');

-- Seed Technicians
INSERT INTO `technicians` (`service_category_id`, `name`, `phone`, `area`, `rating`, `is_available`) VALUES
-- Area: Badda
(1, 'Rahim', '01711-123456', 'Badda', 4.9, 1),
(2, 'Karim', '01811-654321', 'Badda', 4.8, 1),
(3, 'Rafiq', '01922-112233', 'Badda', 4.7, 1),
(4, 'Salam', '01633-445566', 'Badda', 4.9, 1),

-- Area: Aftabnagar
(1, 'Shafiq', '01911-111222', 'Aftabnagar', 4.8, 1),
(2, 'Jabbar', '01511-333444', 'Aftabnagar', 4.9, 1),
(3, 'Nayan',  '01844-998877', 'Aftabnagar', 4.6, 1),
(4, 'Kawsar', '01755-667788', 'Aftabnagar', 4.8, 1);
