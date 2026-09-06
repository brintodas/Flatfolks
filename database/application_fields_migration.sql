SET @db := DATABASE();

ALTER TABLE `viewing_requests`
ADD COLUMN `guarantor_name` varchar(150) DEFAULT NULL,
ADD COLUMN `guarantor_phone` varchar(20) DEFAULT NULL,
ADD COLUMN `guarantor_relation` varchar(50) DEFAULT NULL,
ADD COLUMN `rent_payer` varchar(50) DEFAULT NULL,
ADD COLUMN `expected_duration` varchar(50) DEFAULT NULL,
ADD COLUMN `emergency_contact_name` varchar(150) DEFAULT NULL,
ADD COLUMN `emergency_contact_phone` varchar(20) DEFAULT NULL,
ADD COLUMN `agreed_to_rules` tinyint(1) DEFAULT 0,
ADD COLUMN `id_document` varchar(255) DEFAULT NULL;
