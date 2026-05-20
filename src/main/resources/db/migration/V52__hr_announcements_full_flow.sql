SET @schema_name = DATABASE();

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = @schema_name AND table_name = 'hr_announcements' AND column_name = 'deleted_at') = 0,
  'ALTER TABLE hr_announcements ADD COLUMN deleted_at timestamp NULL DEFAULT NULL AFTER updated_at',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = @schema_name AND table_name = 'hr_announcements' AND column_name = 'deleted_by') = 0,
  'ALTER TABLE hr_announcements ADD COLUMN deleted_by bigint NULL AFTER deleted_at',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS hr_announcement_reads (
  id bigint NOT NULL AUTO_INCREMENT,
  company_id bigint NOT NULL,
  announcement_id bigint NOT NULL,
  user_company_id bigint NOT NULL,
  user_id bigint NOT NULL,
  read_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_hr_announcement_reads_user (announcement_id, user_company_id),
  KEY idx_hr_announcement_reads_company (company_id, user_company_id),
  CONSTRAINT fk_hr_announcement_reads_announcement FOREIGN KEY (announcement_id) REFERENCES hr_announcements (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS hr_announcement_deliveries (
  id bigint NOT NULL AUTO_INCREMENT,
  company_id bigint NOT NULL,
  announcement_id bigint NOT NULL,
  user_company_id bigint NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'delivered',
  delivered_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at timestamp NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_hr_announcement_deliveries_user (announcement_id, user_company_id),
  KEY idx_hr_announcement_deliveries_company (company_id, user_company_id, status),
  CONSTRAINT fk_hr_announcement_deliveries_announcement FOREIGN KEY (announcement_id) REFERENCES hr_announcements (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS hr_announcement_attachments (
  id bigint NOT NULL AUTO_INCREMENT,
  company_id bigint NOT NULL,
  announcement_id bigint NOT NULL,
  original_filename varchar(255) NOT NULL,
  mime_type varchar(120) NOT NULL,
  size_bytes bigint NOT NULL,
  object_key varchar(700) NOT NULL,
  uploaded_by_user_id bigint DEFAULT NULL,
  deleted_at timestamp NULL DEFAULT NULL,
  deleted_by bigint DEFAULT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_hr_announcement_attachments_announcement (company_id, announcement_id, deleted_at),
  CONSTRAINT fk_hr_announcement_attachments_announcement FOREIGN KEY (announcement_id) REFERENCES hr_announcements (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.statistics
   WHERE table_schema = @schema_name AND table_name = 'hr_announcements' AND index_name = 'idx_hr_announcements_visible') = 0,
  'ALTER TABLE hr_announcements ADD INDEX idx_hr_announcements_visible (company_id, status, deleted_at, published_at)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
