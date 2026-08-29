CREATE TABLE consulting_consultant_availability (
  consultant_email VARCHAR(190) NOT NULL,
  day_of_week TINYINT NOT NULL,
  consultant_name VARCHAR(160) NOT NULL,
  timezone VARCHAR(80) NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 0,
  start_time TIME NULL,
  end_time TIME NULL,
  updated_by_user_id BIGINT NOT NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (consultant_email, day_of_week),
  KEY idx_consulting_availability_day (day_of_week, enabled, start_time, end_time),
  KEY idx_consulting_availability_updated_by (updated_by_user_id),
  CONSTRAINT chk_consulting_availability_day
    CHECK (day_of_week BETWEEN 1 AND 7),
  CONSTRAINT chk_consulting_availability_window
    CHECK (
      (enabled = 0 AND start_time IS NULL AND end_time IS NULL)
      OR
      (enabled = 1 AND start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
    ),
  CONSTRAINT fk_consulting_availability_updated_by
    FOREIGN KEY (updated_by_user_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
