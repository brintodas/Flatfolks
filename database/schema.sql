-- ============================================================
--  Flatfolks Database Schema
--  Run this in MySQL / phpMyAdmin to set up the database
-- ============================================================

CREATE DATABASE IF NOT EXISTS flatfolks;
USE flatfolks;

-- ------------------------------------------------------------
--  LISTINGS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS listings (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  title               VARCHAR(255)                          NOT NULL,
  description         TEXT,
  rent                INT                                   NOT NULL,
  location            VARCHAR(255)                          NOT NULL,
  area                VARCHAR(100),
  beds                INT                                   DEFAULT 1,
  furnished           TINYINT(1)                            DEFAULT 0,
  gender_preference   ENUM('any', 'male', 'female')         DEFAULT 'any',
  utilities_included  TINYINT(1)                            DEFAULT 0,
  lease_duration      VARCHAR(50),
  available_from      DATE,
  photos              TEXT,
  landlord_name       VARCHAR(100),
  landlord_phone      VARCHAR(20),
  status              ENUM('active', 'pending', 'inactive') DEFAULT 'active',
  created_at          TIMESTAMP                             DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
--  BOOKMARKS  (FR#4 – saved listings watchlist)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookmarks (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  listing_id  INT         NOT NULL,
  user_key    VARCHAR(64) NOT NULL,          -- browser fingerprint / guest key
  last_rent   INT         NOT NULL,          -- rent at time of bookmark (for drop detection)
  notified    TINYINT(1)  DEFAULT 0,
  created_at  TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY  uniq_bookmark (listing_id, user_key),
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);
