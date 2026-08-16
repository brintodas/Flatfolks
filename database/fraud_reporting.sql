-- Member 2: Scam/Fraud Reporting Module
-- Separate table structure to preserve existing project tables.

CREATE TABLE IF NOT EXISTS fraud_reports (
  id INT NOT NULL AUTO_INCREMENT,
  listing_id INT NOT NULL,
  reporter_id INT NOT NULL,

  category ENUM(
    'scam',
    'misleading_photos',
    'unsafe_condition',
    'fake_landlord',
    'payment_fraud',
    'other'
  ) NOT NULL,

  description TEXT NOT NULL,
  visit_confirmed TINYINT(1) DEFAULT 0,

  status ENUM(
    'pending',
    'under_review',
    'verified_scam',
    'rejected'
  ) NOT NULL DEFAULT 'pending',

  risk_score INT NOT NULL DEFAULT 0,

  risk_level ENUM(
    'low',
    'medium',
    'high'
  ) NOT NULL DEFAULT 'low',

  admin_note TEXT DEFAULT NULL,
  reviewed_by INT DEFAULT NULL,
  reviewed_at TIMESTAMP NULL DEFAULT NULL,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),

  CONSTRAINT fk_fraud_report_listing
    FOREIGN KEY (listing_id)
    REFERENCES listings(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_fraud_report_reporter
    FOREIGN KEY (reporter_id)
    REFERENCES users(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_fraud_report_admin
    FOREIGN KEY (reviewed_by)
    REFERENCES users(id)
    ON DELETE SET NULL
);


CREATE TABLE IF NOT EXISTS fraud_evidence (
  id INT NOT NULL AUTO_INCREMENT,
  report_id INT NOT NULL,

  evidence_type ENUM(
    'image',
    'video'
  ) NOT NULL,

  file_path VARCHAR(500) NOT NULL,
  original_name VARCHAR(255) DEFAULT NULL,
  mime_type VARCHAR(100) DEFAULT NULL,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),

  CONSTRAINT fk_fraud_evidence_report
    FOREIGN KEY (report_id)
    REFERENCES fraud_reports(id)
    ON DELETE CASCADE
);