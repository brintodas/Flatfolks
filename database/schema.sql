-- MariaDB dump 10.19  Distrib 10.4.28-MariaDB, for osx10.10 (x86_64)
--
-- Host: localhost    Database: flatfolks
-- ------------------------------------------------------
-- Server version	10.4.28-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `bookmarks`
--

DROP TABLE IF EXISTS `bookmarks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `bookmarks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `listing_id` int(11) NOT NULL,
  `user_key` varchar(100) NOT NULL,
  `last_rent` int(11) NOT NULL,
  `last_available_from` date DEFAULT NULL,
  `notified` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `listing_id` (`listing_id`),
  CONSTRAINT `bookmarks_ibfk_1` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `conversations`
--

DROP TABLE IF EXISTS `conversations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `conversations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user1_id` int(11) NOT NULL,
  `user2_id` int(11) NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_conv` (`user1_id`,`user2_id`),
  KEY `user2_id` (`user2_id`),
  CONSTRAINT `conversations_ibfk_1` FOREIGN KEY (`user1_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `conversations_ibfk_2` FOREIGN KEY (`user2_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `listings`
--

DROP TABLE IF EXISTS `listings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `listings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `rent` int(11) NOT NULL,
  `location` varchar(255) NOT NULL,
  `area` varchar(100) DEFAULT NULL,
  `district` varchar(100) DEFAULT NULL,
  `beds` int(11) DEFAULT 1,
  `furnished` tinyint(1) DEFAULT 0,
  `gender_preference` enum('any','male','female') DEFAULT 'any',
  `utilities_included` tinyint(1) DEFAULT 0,
  `lease_duration` varchar(50) DEFAULT NULL,
  `available_from` date DEFAULT NULL,
  `photos` text DEFAULT NULL,
  `landlord_name` varchar(100) DEFAULT NULL,
  `landlord_phone` varchar(20) DEFAULT NULL,
  `status` enum('active','pending','inactive') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `video` varchar(255) DEFAULT NULL,
  `floor_plan` varchar(255) DEFAULT NULL,
  `walkthrough_link` varchar(255) DEFAULT NULL,
  `property_type` enum('entire_flat','single_room','shared_room','sublet') DEFAULT 'entire_flat',
  `distance_to_campus` decimal(4,1) DEFAULT NULL,
  `advance_deposit` varchar(100) DEFAULT NULL,
  `curfew_time` varchar(50) DEFAULT NULL,
  `guests_allowed` tinyint(1) DEFAULT 1,
  `smoking_allowed` tinyint(1) DEFAULT 0,
  `has_wifi` tinyint(1) DEFAULT 0,
  `has_generator` tinyint(1) DEFAULT 0,
  `has_cctv` tinyint(1) DEFAULT 0,
  `has_lift` tinyint(1) DEFAULT 0,
  `has_fridge` tinyint(1) DEFAULT 0,
  `is_verified` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `messages`
--

DROP TABLE IF EXISTS `messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `messages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `conversation_id` int(11) NOT NULL,
  `sender_id` int(11) NOT NULL,
  `content` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_read` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `conversation_id` (`conversation_id`),
  KEY `sender_id` (`sender_id`),
  CONSTRAINT `messages_ibfk_1` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `messages_ibfk_2` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `student_profiles`
--

DROP TABLE IF EXISTS `student_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `student_profiles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `university` varchar(150) DEFAULT 'BRAC University',
  `course` varchar(100) DEFAULT NULL,
  `year_of_study` enum('1st','2nd','3rd','4th','Masters') DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `profile_photo` varchar(255) DEFAULT NULL,
  `budget_min` int(11) DEFAULT NULL,
  `budget_max` int(11) DEFAULT NULL,
  `preferred_district` varchar(100) DEFAULT NULL,
  `preferred_area` varchar(100) DEFAULT NULL,
  `move_in_timeframe` varchar(100) DEFAULT NULL,
  `room_type` enum('single','shared','either') DEFAULT 'either',
  `personality_tags` varchar(500) DEFAULT NULL,
  `sleep_schedule` tinyint(4) DEFAULT NULL COMMENT '1=Early bird, 2=Flexible, 3=Night owl',
  `cleanliness` tinyint(4) DEFAULT NULL COMMENT '1=Messy, 2=Average, 3=Neat freak',
  `noise_tolerance` tinyint(4) DEFAULT NULL COMMENT '1=Quiet, 2=Moderate, 3=Loud ok',
  `guests_pref` tinyint(4) DEFAULT NULL COMMENT '1=Never, 2=Occasionally, 3=Frequently',
  `smoking_pref` tinyint(4) DEFAULT NULL COMMENT '1=Non-smoker, 2=Don care, 3=Smoker',
  `study_habits` tinyint(4) DEFAULT NULL COMMENT '1=Home, 2=Mixed, 3=Library',
  `quiz_completed` tinyint(1) DEFAULT 0,
  `w_sleep_schedule` tinyint(4) DEFAULT 3,
  `w_cleanliness` tinyint(4) DEFAULT 3,
  `w_noise_tolerance` tinyint(4) DEFAULT 3,
  `w_guests_pref` tinyint(4) DEFAULT 3,
  `w_smoking_pref` tinyint(4) DEFAULT 3,
  `w_study_habits` tinyint(4) DEFAULT 3,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `student_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `role` enum('student','landlord','admin') NOT NULL,
  `full_name` varchar(150) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `student_id` varchar(100) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `semester` varchar(20) DEFAULT NULL,
  `gender` varchar(30) DEFAULT NULL,
  `budget_min` int(11) DEFAULT NULL,
  `budget_max` int(11) DEFAULT NULL,
  `preferred_district` varchar(100) DEFAULT NULL,
  `preferred_area` varchar(100) DEFAULT NULL,
  `is_verified` tinyint(1) DEFAULT 0,
  `nid` varchar(30) DEFAULT NULL,
  `current_address` varchar(255) DEFAULT NULL,
  `num_properties` int(11) DEFAULT 0,
  `has_badge` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-13 12:38:09
