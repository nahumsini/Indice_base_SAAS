CREATE TABLE IF NOT EXISTS `hr_user_attendance_events` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `user_company_id` bigint DEFAULT NULL,
  `event_type` varchar(20) NOT NULL,
  `event_timestamp` datetime NOT NULL,
  `attendance_date` date NOT NULL,
  `location_id` bigint DEFAULT NULL,
  `kiosk_device_id` bigint DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `photo_url` varchar(255) DEFAULT NULL,
  `source` varchar(20) NOT NULL DEFAULT 'web_self',
  `auth_method` varchar(40) DEFAULT NULL,
  `result_status` varchar(20) DEFAULT NULL,
  `event_kind` varchar(30) DEFAULT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `metadata_json` json DEFAULT NULL,
  `supersedes_event_id` bigint DEFAULT NULL,
  `created_by` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_hr_user_attendance_events_company_date` (`company_id`, `attendance_date`),
  KEY `idx_hr_user_attendance_events_user_date` (`company_id`, `user_id`, `attendance_date`),
  KEY `idx_hr_user_attendance_events_company_location` (`company_id`, `location_id`, `event_timestamp`),
  KEY `idx_hr_user_attendance_events_company_kiosk` (`company_id`, `kiosk_device_id`, `event_timestamp`),
  KEY `idx_hr_user_attendance_events_user_company` (`user_company_id`),
  CONSTRAINT `fk_hr_user_attendance_events_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_user_attendance_events_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_user_attendance_events_user_company` FOREIGN KEY (`user_company_id`) REFERENCES `user_companies` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_hr_user_attendance_events_location` FOREIGN KEY (`location_id`) REFERENCES `hr_attendance_locations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_hr_user_attendance_events_kiosk_device` FOREIGN KEY (`kiosk_device_id`) REFERENCES `hr_kiosk_devices` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_hr_user_attendance_events_supersedes` FOREIGN KEY (`supersedes_event_id`) REFERENCES `hr_user_attendance_events` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `hr_user_attendance_daily_records` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `user_company_id` bigint DEFAULT NULL,
  `attendance_date` date NOT NULL,
  `system_status` varchar(20) NOT NULL,
  `corrected_status` varchar(20) DEFAULT NULL,
  `corrected_by` bigint DEFAULT NULL,
  `corrected_at` datetime DEFAULT NULL,
  `first_check_in_at` datetime DEFAULT NULL,
  `last_check_out_at` datetime DEFAULT NULL,
  `first_location_id` bigint DEFAULT NULL,
  `last_location_id` bigint DEFAULT NULL,
  `minutes_late` int NOT NULL DEFAULT '0',
  `notes` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_hr_user_attendance_daily_records_user_day` (`company_id`, `user_id`, `attendance_date`),
  KEY `idx_hr_user_attendance_daily_records_company_date` (`company_id`, `attendance_date`),
  KEY `idx_hr_user_attendance_daily_records_user_company` (`user_company_id`),
  CONSTRAINT `fk_hr_user_attendance_daily_records_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_user_attendance_daily_records_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_user_attendance_daily_records_user_company` FOREIGN KEY (`user_company_id`) REFERENCES `user_companies` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_hr_user_attendance_daily_records_corrected_by` FOREIGN KEY (`corrected_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_hr_user_attendance_daily_records_first_location` FOREIGN KEY (`first_location_id`) REFERENCES `hr_attendance_locations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_hr_user_attendance_daily_records_last_location` FOREIGN KEY (`last_location_id`) REFERENCES `hr_attendance_locations` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `hr_user_attendance_events`
(`company_id`, `user_id`, `user_company_id`, `event_type`, `event_timestamp`, `attendance_date`,
 `location_id`, `kiosk_device_id`, `latitude`, `longitude`, `photo_url`, `source`, `auth_method`,
 `result_status`, `event_kind`, `notes`, `metadata_json`, `created_by`, `created_at`)
SELECT e.`company_id`,
       access_ref.`linked_user_id`,
       uc.`id`,
       e.`event_type`,
       e.`event_timestamp`,
       e.`attendance_date`,
       e.`location_id`,
       e.`kiosk_device_id`,
       e.`latitude`,
       e.`longitude`,
       e.`photo_url`,
       CASE
         WHEN COALESCE(e.`source`, '') = '' THEN 'legacy_employee_link'
         ELSE e.`source`
       END,
       e.`auth_method`,
       e.`result_status`,
       e.`event_kind`,
       e.`notes`,
       JSON_MERGE_PATCH(
         COALESCE(e.`metadata_json`, JSON_OBJECT()),
         JSON_OBJECT('migrated_from_employee_id', e.`employee_id`, 'migration', 'V28__user_attendance_records')
       ),
       e.`created_by`,
       e.`created_at`
FROM `hr_attendance_events` e
JOIN `hr_employee_portal_access` access_ref
  ON access_ref.`company_id` = e.`company_id`
 AND access_ref.`employee_id` = e.`employee_id`
 AND access_ref.`linked_user_id` IS NOT NULL
LEFT JOIN `user_companies` uc
  ON uc.`company_id` = e.`company_id`
 AND uc.`user_id` = access_ref.`linked_user_id`;

INSERT INTO `hr_user_attendance_daily_records`
(`company_id`, `user_id`, `user_company_id`, `attendance_date`, `system_status`, `corrected_status`,
 `corrected_by`, `corrected_at`, `first_check_in_at`, `last_check_out_at`, `first_location_id`,
 `last_location_id`, `minutes_late`, `notes`, `created_at`, `updated_at`)
SELECT r.`company_id`,
       access_ref.`linked_user_id`,
       uc.`id`,
       r.`attendance_date`,
       r.`system_status`,
       r.`corrected_status`,
       CASE WHEN corrected_user.`id` IS NULL THEN NULL ELSE r.`corrected_by` END,
       r.`corrected_at`,
       r.`first_check_in_at`,
       r.`last_check_out_at`,
       r.`first_location_id`,
       r.`last_location_id`,
       r.`minutes_late`,
       r.`notes`,
       r.`created_at`,
       r.`updated_at`
FROM `hr_attendance_daily_records` r
JOIN `hr_employee_portal_access` access_ref
  ON access_ref.`company_id` = r.`company_id`
 AND access_ref.`employee_id` = r.`employee_id`
 AND access_ref.`linked_user_id` IS NOT NULL
LEFT JOIN `user_companies` uc
  ON uc.`company_id` = r.`company_id`
 AND uc.`user_id` = access_ref.`linked_user_id`
LEFT JOIN `users` corrected_user
  ON corrected_user.`id` = r.`corrected_by`
ON DUPLICATE KEY UPDATE
  `system_status` = VALUES(`system_status`),
  `corrected_status` = VALUES(`corrected_status`),
  `corrected_by` = VALUES(`corrected_by`),
  `corrected_at` = VALUES(`corrected_at`),
  `first_check_in_at` = VALUES(`first_check_in_at`),
  `last_check_out_at` = VALUES(`last_check_out_at`),
  `first_location_id` = VALUES(`first_location_id`),
  `last_location_id` = VALUES(`last_location_id`),
  `minutes_late` = VALUES(`minutes_late`),
  `notes` = VALUES(`notes`),
  `updated_at` = CURRENT_TIMESTAMP;
