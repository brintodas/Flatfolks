-- Review & Rating feature migration
-- Adds a standalone reviews table without modifying existing tables.

CREATE TABLE IF NOT EXISTS reviews (
  id INT NOT NULL AUTO_INCREMENT,
  reviewer_id INT NOT NULL,
  target_type ENUM('roommate','landlord','room','property') NOT NULL,
  target_id INT NOT NULL,
  rating TINYINT NOT NULL,
  review_text TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_reviewer_target (reviewer_id, target_type, target_id),
  KEY idx_reviews_target (target_type, target_id),
  KEY idx_reviews_reviewer (reviewer_id),
  CONSTRAINT reviews_reviewer_fk FOREIGN KEY (reviewer_id)
    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT reviews_rating_check CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
