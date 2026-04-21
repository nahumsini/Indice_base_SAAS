CREATE TABLE IF NOT EXISTS `hr_kiosk_devices` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `unit_id` bigint DEFAULT NULL,
  `business_id` bigint DEFAULT NULL,
  `location_id` bigint DEFAULT NULL,
  `code` varchar(80) NOT NULL,
  `name` varchar(160) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `metadata_json` json DEFAULT NULL,
  `created_by` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_hr_kiosk_devices_company_code` (`company_id`, `code`),
  KEY `idx_hr_kiosk_devices_company_status` (`company_id`, `status`),
  KEY `idx_hr_kiosk_devices_unit` (`unit_id`),
  KEY `idx_hr_kiosk_devices_business` (`business_id`),
  KEY `idx_hr_kiosk_devices_location` (`location_id`),
  CONSTRAINT `fk_hr_kiosk_devices_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_kiosk_devices_unit` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_hr_kiosk_devices_business` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_hr_kiosk_devices_location` FOREIGN KEY (`location_id`) REFERENCES `hr_attendance_locations` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `hr_employee_access_profiles` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `employee_id` bigint NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `default_method` varchar(30) NOT NULL DEFAULT 'manual_override',
  `last_enrolled_at` datetime DEFAULT NULL,
  `metadata_json` json DEFAULT NULL,
  `created_by` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_hr_employee_access_profiles_company_employee` (`company_id`, `employee_id`),
  KEY `idx_hr_employee_access_profiles_company_status` (`company_id`, `status`),
  CONSTRAINT `fk_hr_employee_access_profiles_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_employee_access_profiles_employee` FOREIGN KEY (`employee_id`) REFERENCES `hr_employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `hr_employee_access_methods` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `access_profile_id` bigint NOT NULL,
  `method_type` varchar(30) NOT NULL,
  `credential_ref` varchar(120) DEFAULT NULL,
  `secret_hash` varchar(255) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `priority` int NOT NULL DEFAULT '100',
  `metadata_json` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_hr_employee_access_methods_company_method_ref` (`company_id`, `method_type`, `credential_ref`),
  KEY `idx_hr_employee_access_methods_profile_status` (`access_profile_id`, `status`),
  KEY `idx_hr_employee_access_methods_company_method` (`company_id`, `method_type`, `status`),
  CONSTRAINT `fk_hr_employee_access_methods_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_employee_access_methods_profile` FOREIGN KEY (`access_profile_id`) REFERENCES `hr_employee_access_profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE `hr_attendance_events`
  MODIFY COLUMN `latitude` decimal(10,7) DEFAULT NULL,
  MODIFY COLUMN `longitude` decimal(10,7) DEFAULT NULL,
  ADD COLUMN `kiosk_device_id` bigint DEFAULT NULL AFTER `location_id`,
  ADD COLUMN `auth_method` varchar(30) DEFAULT NULL AFTER `source`,
  ADD COLUMN `result_status` varchar(20) DEFAULT NULL AFTER `auth_method`,
  ADD COLUMN `event_kind` varchar(30) DEFAULT NULL AFTER `result_status`,
  ADD COLUMN `metadata_json` json DEFAULT NULL AFTER `notes`,
  ADD COLUMN `supersedes_event_id` bigint DEFAULT NULL AFTER `metadata_json`;

ALTER TABLE `hr_attendance_events`
  ADD KEY `idx_hr_attendance_events_company_employee_timestamp` (`company_id`, `employee_id`, `event_timestamp`),
  ADD KEY `idx_hr_attendance_events_company_kiosk_timestamp` (`company_id`, `kiosk_device_id`, `event_timestamp`),
  ADD CONSTRAINT `fk_hr_attendance_events_kiosk_device` FOREIGN KEY (`kiosk_device_id`) REFERENCES `hr_kiosk_devices` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_hr_attendance_events_supersedes` FOREIGN KEY (`supersedes_event_id`) REFERENCES `hr_attendance_events` (`id`) ON DELETE SET NULL;

UPDATE `hr_attendance_events`
SET `auth_method` = COALESCE(NULLIF(`auth_method`, ''), 'manual_override'),
    `result_status` = COALESCE(NULLIF(`result_status`, ''), 'success'),
    `event_kind` = COALESCE(NULLIF(`event_kind`, ''), `event_type`)
WHERE 1 = 1;

INSERT INTO `hr_kiosk_devices`
(`company_id`, `unit_id`, `business_id`, `location_id`, `code`, `name`, `status`, `metadata_json`, `created_by`)
SELECT 1,
       5,
       5,
       l.id,
       'spring-front-kiosk',
       'Spring Front Kiosk',
       'active',
       JSON_OBJECT('mode', 'shared', 'supports_face_recognition', false),
       1
FROM `hr_attendance_locations` l
WHERE l.company_id = 1
  AND l.name = 'Spring HQ'
  AND NOT EXISTS (
    SELECT 1
    FROM `hr_kiosk_devices`
    WHERE `company_id` = 1
      AND `code` = 'spring-front-kiosk'
  );

INSERT INTO `hr_employee_access_profiles`
(`company_id`, `employee_id`, `status`, `default_method`, `last_enrolled_at`, `metadata_json`, `created_by`)
SELECT e.company_id,
       e.id,
       'active',
       'manual_override',
       CURRENT_TIMESTAMP,
       JSON_OBJECT('supports_face_recognition', false),
       1
FROM `hr_employees` e
WHERE COALESCE(LOWER(e.status), 'active') <> 'terminated'
  AND NOT EXISTS (
    SELECT 1
    FROM `hr_employee_access_profiles` p
    WHERE p.company_id = e.company_id
      AND p.employee_id = e.id
  );

INSERT INTO `hr_employee_access_methods`
(`company_id`, `access_profile_id`, `method_type`, `credential_ref`, `secret_hash`, `status`, `priority`, `metadata_json`)
SELECT p.company_id,
       p.id,
       'manual_override',
       NULL,
       NULL,
       'active',
       100,
       JSON_OBJECT('label', 'Manual override')
FROM `hr_employee_access_profiles` p
WHERE NOT EXISTS (
  SELECT 1
  FROM `hr_employee_access_methods` m
  WHERE m.company_id = p.company_id
    AND m.access_profile_id = p.id
    AND m.method_type = 'manual_override'
);
