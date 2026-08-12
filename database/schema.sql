-- Run this in MySQL / phpMyAdmin to set up the database

CREATE DATABASE IF NOT EXISTS flatfolks;
USE flatfolks;

CREATE TABLE IF NOT EXISTS listings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  rent INT NOT NULL,
  location VARCHAR(255) NOT NULL,
  area VARCHAR(100),
  beds INT DEFAULT 1,
  furnished TINYINT(1) DEFAULT 0,
  gender_preference ENUM('any', 'male', 'female') DEFAULT 'any',
  utilities_included TINYINT(1) DEFAULT 0,
  lease_duration VARCHAR(50),
  available_from DATE,
  photos TEXT,
  video VARCHAR(255),
  floor_plan VARCHAR(255),
  walkthrough_link VARCHAR(255),
  property_type ENUM('entire_flat','single_room','shared_room','sublet') DEFAULT 'entire_flat',
  distance_to_campus VARCHAR(100),
  advance_deposit VARCHAR(100),
  curfew_time VARCHAR(50),
  guests_allowed TINYINT(1) DEFAULT 1,
  smoking_allowed TINYINT(1) DEFAULT 0,
  has_wifi TINYINT(1) DEFAULT 0,
  has_generator TINYINT(1) DEFAULT 0,
  has_cctv TINYINT(1) DEFAULT 0,
  has_lift TINYINT(1) DEFAULT 0,
  has_fridge TINYINT(1) DEFAULT 0,
  landlord_name VARCHAR(100),
  landlord_phone VARCHAR(20),
  status ENUM('active', 'pending', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
