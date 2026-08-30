-- Meal plans / catering / mess subscription feature
-- Run after base schema.sql

CREATE TABLE IF NOT EXISTS `meal_providers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `contact_phone` varchar(20) DEFAULT NULL,
  `contact_email` varchar(150) DEFAULT NULL,
  `area` varchar(100) DEFAULT NULL,
  `district` varchar(100) DEFAULT 'Dhaka',
  `description` text DEFAULT NULL,
  `is_verified` tinyint(1) DEFAULT 0,
  `rating_avg` decimal(3,2) DEFAULT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `meal_plans` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `provider_id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `meal_type` enum('breakfast','lunch','dinner','full_board','custom') NOT NULL,
  `meals_per_day` tinyint(4) DEFAULT 2,
  `price_monthly` decimal(10,2) DEFAULT NULL,
  `price_weekly` decimal(10,2) DEFAULT NULL,
  `delivery_type` enum('pickup','home_delivery','both') NOT NULL DEFAULT 'pickup',
  `cuisine_tags` varchar(255) DEFAULT NULL,
  `serving_areas` varchar(500) DEFAULT NULL,
  `menu_sample` text DEFAULT NULL,
  `min_commitment` enum('weekly','monthly','semester') NOT NULL DEFAULT 'monthly',
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_provider` (`provider_id`),
  CONSTRAINT `meal_plans_provider_fk` FOREIGN KEY (`provider_id`) REFERENCES `meal_providers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `meal_subscriptions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `plan_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `status` enum('pending','active','paused','cancelled','expired') NOT NULL DEFAULT 'pending',
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `delivery_address` varchar(255) DEFAULT NULL,
  `special_notes` varchar(500) DEFAULT NULL,
  `payment_method` enum('bkash','nagad','cash','bank','other') NOT NULL DEFAULT 'bkash',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_plan` (`plan_id`),
  CONSTRAINT `meal_subscriptions_plan_fk` FOREIGN KEY (`plan_id`) REFERENCES `meal_plans` (`id`),
  CONSTRAINT `meal_subscriptions_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Seed providers
INSERT INTO `meal_providers` (`id`, `name`, `contact_phone`, `contact_email`, `area`, `district`, `description`, `is_verified`, `rating_avg`, `status`) VALUES
(1, 'Badda Student Mess', '01711000001', 'badda.mess@flatfolks.local', 'Badda', 'Dhaka', 'Small mess run by Rahim bhai near Link Road. Mostly BRACU students. Food is simple but filling — nothing fancy, just proper home-style bhaat-dal.', 1, 4.60, 'active'),
(2, 'Dhanmondi Home Kitchen', '01711000002', 'dhanmondi.kitchen@flatfolks.local', 'Dhanmondi', 'Dhaka', 'Run by Aunty Farida from her flat kitchen. Good if you just moved in and the stove is not set up yet. Lunch boxes only, no dine-in.', 1, 4.50, 'active'),
(3, 'Uttara Mess Point', '01711000003', 'uttara.mess@flatfolks.local', 'Uttara', 'Dhaka', 'Sector 4 er pasher mess. Breakfast is basic but lunch is solid. A lot of NSU and UIU students eat here.', 1, 4.40, 'active'),
(4, 'Bashundhara Catering Hub', '01711000004', 'bashundhara.catering@flatfolks.local', 'Bashundhara R/A', 'Dhaka', 'Slightly better quality than average mess — they actually change the menu and don't repeat chicken curry 5 days straight.', 1, 4.70, 'active'),
(5, 'Mirpur Student Meals', '01711000005', 'mirpur.meals@flatfolks.local', 'Mirpur', 'Dhaka', 'Cheapest option on the list. Portions are okay, taste is fine for the price. Pickup from Mirpur 10 stand.', 0, 4.30, 'active');

-- Seed plans
INSERT INTO `meal_plans` (`id`, `provider_id`, `name`, `meal_type`, `meals_per_day`, `price_monthly`, `price_weekly`, `delivery_type`, `cuisine_tags`, `serving_areas`, `menu_sample`, `min_commitment`, `status`) VALUES
(1, 1, 'Lunch + Dinner Standard', 'custom', 2, 5500.00, 1500.00, 'pickup', 'bengali,halal', 'Badda,Rampura,Khilgaon', 'Weekly rotation (rough idea):\nMon — bhaat, mug dal, alu bhaji, dim bhuna\nTue — bhaat, dal, begun bharta, chicken curry\nWed — bhaat, dal, shobji, beef (small piece)\nThu — khichuri + dim bhaji + begun fry (dinner)\nFri — bhaat, dal, mixed veg, rui mach\nSat/Sun — same cycle repeats\n\nLunch pickup 12:30, dinner 8:00 from Link Road. Extra rice free if you ask.', 'monthly', 'active'),
(2, 1, 'Full Board Student Plan', 'full_board', 3, 7500.00, 2100.00, 'both', 'bengali,halal', 'Badda,Rampura', 'Breakfast (8–9am):\nParatha + dim bhuji, or bread + butter. Friday sometimes halim.\n\nLunch:\nNormal bhaat-dal-tarkari. Fish twice a week.\n\nDinner:\nLighter meals — khichuri on Thu, rest days bhaat + dal + bhaji.\n\nNot restaurant quality but you won''t stay hungry. Most guys from Block D eat here.', 'monthly', 'active'),
(3, 2, 'Lunch Only', 'lunch', 1, 3200.00, 900.00, 'home_delivery', 'bengali,halal,veg-option', 'Dhanmondi,Lalmatia,Mohammadpur', 'Sample week:\nSun — bhaat, dal, potol bhaji, rui macher jhol, achaar\nMon — bhaat, dal, shobji, chicken curry\nTue — bhaat, dal, alu posto, dim er omelette\nWed — bhaat, dal, begun bhaja, beef bhuna\nThu — bhaat, dal, mixed veg, fish fry\nFri — polao, chicken roast, salad\nSat — khichuri, dim bhaji, begun\n\nBox arrives 12:45–1:15. Tell Aunty if you want less oil or no beef.', 'weekly', 'active'),
(4, 2, 'Dinner Only', 'dinner', 1, 3500.00, 950.00, 'home_delivery', 'bengali,halal', 'Dhanmondi,Lalmatia', 'Evening box (7:30–8:15 delivery):\nSun — bhaat, dal, shobji, fish curry\nMon — khichuri + dim bhaji\nTue — bhaat, dal, chicken, salad\nWed — bhaat, dal, alu bharta, begun fry\nThu — bhaat, dal, mixed veg, dim bhuna\nFri — fried rice + chicken (small treat)\nSat — bhaat, dal, shutki bhuna (optional — skip if you hate shutki)\n\nLeave tiffin outside door. She collects empty boxes next morning.', 'weekly', 'active'),
(5, 3, 'Breakfast + Lunch', 'custom', 2, 4800.00, 1300.00, 'pickup', 'bengali,halal', 'Uttara,Vatara,Kuril', 'Breakfast (7:45–8:30):\nRoti/paratha + sabzi, or chira-muri on rush days.\n\nLunch (1:00–2:00):\nMon — bhaat, dal, alu dom, egg curry\nTue — bhaat, dal, shobji, chicken\nWed — bhaat, dal, begun, fish\nThu — khichuri + dim\nFri — bhaat, dal, mixed veg, beef\n\nPickup from Sector 4 mess gate. Come early or the good eggs run out.', 'monthly', 'active'),
(6, 3, 'Full Board Mess', 'full_board', 3, 8200.00, NULL, 'pickup', 'bengali,halal', 'Uttara', 'They post the week''s menu on a whiteboard every Saturday.\n\nTypical week:\nBreakfast — paratha, dim, tea (yes, tea included)\nLunch — bhaat, dal, 2 bhaji, protein (fish/chicken/egg rotating)\nDinner — usually lighter, khichuri 2x/week\n\nFriday lunch is better — sometimes korma if enough subscribers.\nSemester plan gets you a locked seat. No refund if you skip — they''re strict about that.', 'semester', 'active'),
(7, 4, 'Lunch + Dinner Premium', 'custom', 2, 6800.00, 1850.00, 'both', 'bengali,halal,continental', 'Bashundhara R/A,Kuril,Badda', 'Lunch sample:\nBhaat/roti option, dal, 2 sides, protein (fish/chicken/mutton on Fri), salad, borhani on Fridays.\n\nDinner sample:\nMon — pasta + chicken steak (small)\nTue — bhaat, dal, fish\nWed — fried rice + chilli chicken\nThu — bhaat, dal, shobji, beef\nFri — BBQ chicken + naan\nSat — khichuri or biryani (alternate weeks)\nSun — home-style bhaat-dal-fish\n\nDelivery to Bashundhara blocks. Pickup also available from Jamuna Future Park side.', 'monthly', 'active'),
(8, 4, 'Weekly Trial Pack', 'custom', 2, NULL, 1700.00, 'home_delivery', 'bengali,halal', 'Bashundhara R/A', '7-day trial menu (what you actually get):\nDay 1 — lunch: bhaat-dal-chicken, dinner: khichuri-dim\nDay 2 — lunch: fish curry, dinner: fried rice-egg\nDay 3 — lunch: beef bhuna, dinner: bhaat-dal-bhaji\nDay 4 — lunch: shobji-egg, dinner: chicken curry\nDay 5 — lunch: polao-chicken, dinner: light khichuri\nDay 6 — lunch: bhaat-dal-fish, dinner: pasta (yes, pasta)\nDay 7 — lunch: biryani small, dinner: soup + bread\n\nGood way to test before monthly. Delivery slot 1pm / 8pm.', 'weekly', 'active'),
(9, 5, 'Budget Lunch Mess', 'lunch', 1, 2800.00, 800.00, 'pickup', 'bengali,halal', 'Mirpur,Mohakhali', 'Mon — bhaat, dal, alu bhaji, dim\nTue — bhaat, dal, shobji, chicken (small)\nWed — bhaat, dal, begun, fish (if available)\nThu — khichuri, dim\nFri — bhaat, dal, mixed veg, egg curry\n\nSame thing most weeks. Don''t expect variety — you''re paying 2800/month.\nPickup Mirpur 10 er counter, 12:30 sharp. Late = cold food.', 'monthly', 'active'),
(10, 5, 'Dinner Mess', 'dinner', 1, 3000.00, 850.00, 'pickup', 'bengali,halal', 'Mirpur', 'Dinner only (8:00–8:30 pickup):\nSun/Tue/Thu — bhaat, dal, shobji, chicken or fish\nMon — khichuri + begun bhaja\nWed — bhaat, dal, alu-posto, dim\nFri — fried rice + egg (Friday special)\nSat — bhaat, dal, shutki or shobji\n\nPortions are decent. Bring your own tiffin box if you want — they charge 50 tk less.', 'monthly', 'active');
