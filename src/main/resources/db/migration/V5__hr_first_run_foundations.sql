ALTER TABLE `hr_employees`
  ADD COLUMN `unit_id` bigint DEFAULT NULL AFTER `department`,
  ADD COLUMN `business_id` bigint DEFAULT NULL AFTER `unit_id`,
  ADD COLUMN `pay_period` varchar(20) DEFAULT 'weekly' AFTER `salary`,
  ADD COLUMN `salary_type` varchar(20) DEFAULT 'daily' AFTER `pay_period`,
  ADD COLUMN `hourly_rate` decimal(10,2) DEFAULT NULL AFTER `salary_type`,
  ADD COLUMN `contract_type` varchar(20) DEFAULT 'permanent' AFTER `hourly_rate`,
  ADD COLUMN `contract_start_date` date DEFAULT NULL AFTER `contract_type`,
  ADD COLUMN `contract_end_date` date DEFAULT NULL AFTER `contract_start_date`,
  ADD COLUMN `termination_date` date DEFAULT NULL AFTER `contract_end_date`,
  ADD COLUMN `last_working_day` date DEFAULT NULL AFTER `termination_date`,
  ADD COLUMN `termination_reason_type` varchar(40) DEFAULT NULL AFTER `last_working_day`,
  ADD COLUMN `termination_reason_code` varchar(80) DEFAULT NULL AFTER `termination_reason_type`,
  ADD COLUMN `termination_summary` text DEFAULT NULL AFTER `termination_reason_code`;

CREATE INDEX `idx_hr_employees_unit_id` ON `hr_employees` (`unit_id`);
CREATE INDEX `idx_hr_employees_business_id` ON `hr_employees` (`business_id`);
CREATE INDEX `idx_hr_employees_status_company` ON `hr_employees` (`company_id`, `status`);

UPDATE `hr_employees`
SET `pay_period` = COALESCE(NULLIF(`pay_period`, ''), 'weekly'),
    `salary_type` = COALESCE(NULLIF(`salary_type`, ''), 'daily'),
    `contract_type` = COALESCE(NULLIF(`contract_type`, ''), 'permanent'),
    `contract_start_date` = COALESCE(`contract_start_date`, `hire_date`)
WHERE 1 = 1;

CREATE TABLE IF NOT EXISTS `hr_attendance_locations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `name` varchar(160) NOT NULL,
  `latitude` decimal(10,7) NOT NULL,
  `longitude` decimal(10,7) NOT NULL,
  `radius_meters` int NOT NULL DEFAULT '80',
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `created_by` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_hr_attendance_locations_company` (`company_id`),
  CONSTRAINT `fk_hr_attendance_locations_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `hr_schedule_templates` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `name` varchar(160) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `created_by` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_hr_schedule_templates_company` (`company_id`),
  CONSTRAINT `fk_hr_schedule_templates_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `hr_schedule_template_days` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `template_id` bigint NOT NULL,
  `day_of_week` tinyint NOT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `late_after_minutes` int NOT NULL DEFAULT '10',
  `is_rest_day` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_hr_schedule_template_days_template_day` (`template_id`, `day_of_week`),
  CONSTRAINT `fk_hr_schedule_template_days_template` FOREIGN KEY (`template_id`) REFERENCES `hr_schedule_templates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `hr_employee_schedule_assignments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `employee_id` bigint NOT NULL,
  `template_id` bigint NOT NULL,
  `effective_start_date` date NOT NULL,
  `effective_end_date` date DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `created_by` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_hr_employee_schedule_assignments_company_employee` (`company_id`, `employee_id`),
  CONSTRAINT `fk_hr_employee_schedule_assignments_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_employee_schedule_assignments_employee` FOREIGN KEY (`employee_id`) REFERENCES `hr_employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_employee_schedule_assignments_template` FOREIGN KEY (`template_id`) REFERENCES `hr_schedule_templates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `hr_attendance_events` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `employee_id` bigint NOT NULL,
  `event_type` varchar(20) NOT NULL,
  `event_timestamp` datetime NOT NULL,
  `attendance_date` date NOT NULL,
  `location_id` bigint DEFAULT NULL,
  `latitude` decimal(10,7) NOT NULL,
  `longitude` decimal(10,7) NOT NULL,
  `photo_url` varchar(255) DEFAULT NULL,
  `source` varchar(20) NOT NULL DEFAULT 'kiosk',
  `notes` varchar(255) DEFAULT NULL,
  `created_by` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_hr_attendance_events_company_date` (`company_id`, `attendance_date`),
  KEY `idx_hr_attendance_events_employee_date` (`employee_id`, `attendance_date`),
  CONSTRAINT `fk_hr_attendance_events_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_attendance_events_employee` FOREIGN KEY (`employee_id`) REFERENCES `hr_employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_attendance_events_location` FOREIGN KEY (`location_id`) REFERENCES `hr_attendance_locations` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `hr_attendance_daily_records` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `employee_id` bigint NOT NULL,
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
  `source_schedule_template_id` bigint DEFAULT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_hr_attendance_daily_records_employee_day` (`company_id`, `employee_id`, `attendance_date`),
  KEY `idx_hr_attendance_daily_records_company_date` (`company_id`, `attendance_date`),
  CONSTRAINT `fk_hr_attendance_daily_records_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_attendance_daily_records_employee` FOREIGN KEY (`employee_id`) REFERENCES `hr_employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_attendance_daily_records_schedule_template` FOREIGN KEY (`source_schedule_template_id`) REFERENCES `hr_schedule_templates` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_hr_attendance_daily_records_first_location` FOREIGN KEY (`first_location_id`) REFERENCES `hr_attendance_locations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_hr_attendance_daily_records_last_location` FOREIGN KEY (`last_location_id`) REFERENCES `hr_attendance_locations` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `hr_announcements` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `title` varchar(200) NOT NULL,
  `announcement_type` varchar(40) NOT NULL,
  `content` text NOT NULL,
  `audience_type` varchar(30) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'draft',
  `scheduled_for` datetime DEFAULT NULL,
  `published_at` datetime DEFAULT NULL,
  `created_by` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_hr_announcements_company_status` (`company_id`, `status`),
  CONSTRAINT `fk_hr_announcements_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `hr_announcement_targets` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `announcement_id` bigint NOT NULL,
  `target_type` varchar(20) NOT NULL,
  `target_value` varchar(120) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_hr_announcement_targets_announcement` (`announcement_id`),
  CONSTRAINT `fk_hr_announcement_targets_announcement` FOREIGN KEY (`announcement_id`) REFERENCES `hr_announcements` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `hr_attendance_locations` (`company_id`, `name`, `latitude`, `longitude`, `radius_meters`, `status`, `created_by`)
SELECT 1, 'Spring HQ', 25.6866140, -100.3161130, 120, 'active', 1
WHERE NOT EXISTS (
  SELECT 1
  FROM `hr_attendance_locations`
  WHERE `company_id` = 1
    AND `name` = 'Spring HQ'
);

INSERT INTO `hr_schedule_templates` (`company_id`, `name`, `status`, `created_by`)
SELECT 1, 'Spring Default Schedule', 'active', 1
WHERE NOT EXISTS (
  SELECT 1
  FROM `hr_schedule_templates`
  WHERE `company_id` = 1
    AND `name` = 'Spring Default Schedule'
);

INSERT INTO `hr_schedule_template_days` (`template_id`, `day_of_week`, `start_time`, `end_time`, `late_after_minutes`, `is_rest_day`)
SELECT `id`,
       1,
       '08:30:00',
       '17:30:00',
       15,
       0
FROM `hr_schedule_templates`
WHERE `company_id` = 1
  AND `name` = 'Spring Default Schedule'
  AND NOT EXISTS (
    SELECT 1
    FROM `hr_schedule_template_days`
    WHERE `template_id` = `hr_schedule_templates`.`id`
      AND `day_of_week` = 1
  );

INSERT INTO `hr_schedule_template_days` (`template_id`, `day_of_week`, `start_time`, `end_time`, `late_after_minutes`, `is_rest_day`)
SELECT `id`,
       2,
       '08:30:00',
       '17:30:00',
       15,
       0
FROM `hr_schedule_templates`
WHERE `company_id` = 1
  AND `name` = 'Spring Default Schedule'
  AND NOT EXISTS (
    SELECT 1
    FROM `hr_schedule_template_days`
    WHERE `template_id` = `hr_schedule_templates`.`id`
      AND `day_of_week` = 2
  );

INSERT INTO `hr_schedule_template_days` (`template_id`, `day_of_week`, `start_time`, `end_time`, `late_after_minutes`, `is_rest_day`)
SELECT `id`,
       3,
       '08:30:00',
       '17:30:00',
       15,
       0
FROM `hr_schedule_templates`
WHERE `company_id` = 1
  AND `name` = 'Spring Default Schedule'
  AND NOT EXISTS (
    SELECT 1
    FROM `hr_schedule_template_days`
    WHERE `template_id` = `hr_schedule_templates`.`id`
      AND `day_of_week` = 3
  );

INSERT INTO `hr_schedule_template_days` (`template_id`, `day_of_week`, `start_time`, `end_time`, `late_after_minutes`, `is_rest_day`)
SELECT `id`,
       4,
       '08:30:00',
       '17:30:00',
       15,
       0
FROM `hr_schedule_templates`
WHERE `company_id` = 1
  AND `name` = 'Spring Default Schedule'
  AND NOT EXISTS (
    SELECT 1
    FROM `hr_schedule_template_days`
    WHERE `template_id` = `hr_schedule_templates`.`id`
      AND `day_of_week` = 4
  );

INSERT INTO `hr_schedule_template_days` (`template_id`, `day_of_week`, `start_time`, `end_time`, `late_after_minutes`, `is_rest_day`)
SELECT `id`,
       5,
       '08:30:00',
       '17:30:00',
       15,
       0
FROM `hr_schedule_templates`
WHERE `company_id` = 1
  AND `name` = 'Spring Default Schedule'
  AND NOT EXISTS (
    SELECT 1
    FROM `hr_schedule_template_days`
    WHERE `template_id` = `hr_schedule_templates`.`id`
      AND `day_of_week` = 5
  );

INSERT INTO `hr_schedule_template_days` (`template_id`, `day_of_week`, `start_time`, `end_time`, `late_after_minutes`, `is_rest_day`)
SELECT `id`,
       6,
       NULL,
       NULL,
       0,
       1
FROM `hr_schedule_templates`
WHERE `company_id` = 1
  AND `name` = 'Spring Default Schedule'
  AND NOT EXISTS (
    SELECT 1
    FROM `hr_schedule_template_days`
    WHERE `template_id` = `hr_schedule_templates`.`id`
      AND `day_of_week` = 6
  );

INSERT INTO `hr_schedule_template_days` (`template_id`, `day_of_week`, `start_time`, `end_time`, `late_after_minutes`, `is_rest_day`)
SELECT `id`,
       7,
       NULL,
       NULL,
       0,
       1
FROM `hr_schedule_templates`
WHERE `company_id` = 1
  AND `name` = 'Spring Default Schedule'
  AND NOT EXISTS (
    SELECT 1
    FROM `hr_schedule_template_days`
    WHERE `template_id` = `hr_schedule_templates`.`id`
      AND `day_of_week` = 7
  );

INSERT INTO `hr_employee_schedule_assignments` (`company_id`, `employee_id`, `template_id`, `effective_start_date`, `status`, `created_by`)
SELECT e.`company_id`,
       e.`id`,
       t.`id`,
       COALESCE(e.`hire_date`, '2026-04-01'),
       'active',
       1
FROM `hr_employees` e
JOIN `hr_schedule_templates` t
  ON t.`company_id` = e.`company_id`
 AND t.`name` = 'Spring Default Schedule'
WHERE e.`company_id` = 1
  AND NOT EXISTS (
    SELECT 1
    FROM `hr_employee_schedule_assignments` a
    WHERE a.`company_id` = e.`company_id`
      AND a.`employee_id` = e.`id`
      AND a.`status` = 'active'
  );

INSERT INTO `hr_attendance_events` (`company_id`, `employee_id`, `event_type`, `event_timestamp`, `attendance_date`, `location_id`, `latitude`, `longitude`, `source`, `created_by`)
SELECT 1,
       2,
       'check_in',
       '2026-04-01 08:28:00',
       '2026-04-01',
       l.`id`,
       l.`latitude`,
       l.`longitude`,
       'seed',
       1
FROM `hr_attendance_locations` l
WHERE l.`company_id` = 1
  AND l.`name` = 'Spring HQ'
  AND EXISTS (SELECT 1 FROM `hr_employees` e WHERE e.`id` = 2 AND e.`company_id` = 1)
  AND NOT EXISTS (
    SELECT 1
    FROM `hr_attendance_events`
    WHERE `company_id` = 1
      AND `employee_id` = 2
      AND `event_type` = 'check_in'
      AND `attendance_date` = '2026-04-01'
  );

INSERT INTO `hr_attendance_events` (`company_id`, `employee_id`, `event_type`, `event_timestamp`, `attendance_date`, `location_id`, `latitude`, `longitude`, `source`, `created_by`)
SELECT 1,
       2,
       'check_out',
       '2026-04-01 17:31:00',
       '2026-04-01',
       l.`id`,
       l.`latitude`,
       l.`longitude`,
       'seed',
       1
FROM `hr_attendance_locations` l
WHERE l.`company_id` = 1
  AND l.`name` = 'Spring HQ'
  AND EXISTS (SELECT 1 FROM `hr_employees` e WHERE e.`id` = 2 AND e.`company_id` = 1)
  AND NOT EXISTS (
    SELECT 1
    FROM `hr_attendance_events`
    WHERE `company_id` = 1
      AND `employee_id` = 2
      AND `event_type` = 'check_out'
      AND `attendance_date` = '2026-04-01'
  );

INSERT INTO `hr_attendance_events` (`company_id`, `employee_id`, `event_type`, `event_timestamp`, `attendance_date`, `location_id`, `latitude`, `longitude`, `source`, `created_by`)
SELECT 1,
       2,
       'check_in',
       '2026-04-02 08:49:00',
       '2026-04-02',
       l.`id`,
       l.`latitude`,
       l.`longitude`,
       'seed',
       1
FROM `hr_attendance_locations` l
WHERE l.`company_id` = 1
  AND l.`name` = 'Spring HQ'
  AND EXISTS (SELECT 1 FROM `hr_employees` e WHERE e.`id` = 2 AND e.`company_id` = 1)
  AND NOT EXISTS (
    SELECT 1
    FROM `hr_attendance_events`
    WHERE `company_id` = 1
      AND `employee_id` = 2
      AND `event_type` = 'check_in'
      AND `attendance_date` = '2026-04-02'
  );

INSERT INTO `hr_attendance_events` (`company_id`, `employee_id`, `event_type`, `event_timestamp`, `attendance_date`, `location_id`, `latitude`, `longitude`, `source`, `created_by`)
SELECT 1,
       2,
       'check_out',
       '2026-04-02 17:14:00',
       '2026-04-02',
       l.`id`,
       l.`latitude`,
       l.`longitude`,
       'seed',
       1
FROM `hr_attendance_locations` l
WHERE l.`company_id` = 1
  AND l.`name` = 'Spring HQ'
  AND EXISTS (SELECT 1 FROM `hr_employees` e WHERE e.`id` = 2 AND e.`company_id` = 1)
  AND NOT EXISTS (
    SELECT 1
    FROM `hr_attendance_events`
    WHERE `company_id` = 1
      AND `employee_id` = 2
      AND `event_type` = 'check_out'
      AND `attendance_date` = '2026-04-02'
  );

INSERT INTO `hr_attendance_daily_records` (`company_id`, `employee_id`, `attendance_date`, `system_status`, `first_check_in_at`, `last_check_out_at`, `first_location_id`, `last_location_id`, `minutes_late`, `source_schedule_template_id`, `notes`)
SELECT 1,
       2,
       '2026-04-01',
       'on_time',
       '2026-04-01 08:28:00',
       '2026-04-01 17:31:00',
       l.`id`,
       l.`id`,
       0,
       t.`id`,
       'Seeded demo attendance'
FROM `hr_attendance_locations` l
JOIN `hr_schedule_templates` t
  ON t.`company_id` = 1
 AND t.`name` = 'Spring Default Schedule'
WHERE l.`company_id` = 1
  AND l.`name` = 'Spring HQ'
  AND EXISTS (SELECT 1 FROM `hr_employees` e WHERE e.`id` = 2 AND e.`company_id` = 1)
  AND NOT EXISTS (
    SELECT 1
    FROM `hr_attendance_daily_records`
    WHERE `company_id` = 1
      AND `employee_id` = 2
      AND `attendance_date` = '2026-04-01'
  );

INSERT INTO `hr_attendance_daily_records` (`company_id`, `employee_id`, `attendance_date`, `system_status`, `first_check_in_at`, `last_check_out_at`, `first_location_id`, `last_location_id`, `minutes_late`, `source_schedule_template_id`, `notes`)
SELECT 1,
       2,
       '2026-04-02',
       'late',
       '2026-04-02 08:49:00',
       '2026-04-02 17:14:00',
       l.`id`,
       l.`id`,
       19,
       t.`id`,
       'Seeded demo attendance'
FROM `hr_attendance_locations` l
JOIN `hr_schedule_templates` t
  ON t.`company_id` = 1
 AND t.`name` = 'Spring Default Schedule'
WHERE l.`company_id` = 1
  AND l.`name` = 'Spring HQ'
  AND EXISTS (SELECT 1 FROM `hr_employees` e WHERE e.`id` = 2 AND e.`company_id` = 1)
  AND NOT EXISTS (
    SELECT 1
    FROM `hr_attendance_daily_records`
    WHERE `company_id` = 1
      AND `employee_id` = 2
      AND `attendance_date` = '2026-04-02'
  );

INSERT INTO `hr_announcements` (`company_id`, `title`, `announcement_type`, `content`, `audience_type`, `status`, `scheduled_for`, `published_at`, `created_by`)
SELECT 1,
       'Cambio de horario operativo',
       'urgent',
       'A partir del lunes, la reunión de arranque cambia a las 8:15 AM para Operaciones.',
       'units',
       'published',
       NULL,
       '2026-04-01 08:00:00',
       1
WHERE NOT EXISTS (
  SELECT 1
  FROM `hr_announcements`
  WHERE `company_id` = 1
    AND `title` = 'Cambio de horario operativo'
);

INSERT INTO `hr_announcements` (`company_id`, `title`, `announcement_type`, `content`, `audience_type`, `status`, `scheduled_for`, `published_at`, `created_by`)
SELECT 1,
       'Recordatorio de evaluaciones mensuales',
       'reminder',
       'Los líderes deben completar las evaluaciones mensuales antes del viernes a las 5:00 PM.',
       'all',
       'scheduled',
       '2026-04-10 09:30:00',
       NULL,
       1
WHERE NOT EXISTS (
  SELECT 1
  FROM `hr_announcements`
  WHERE `company_id` = 1
    AND `title` = 'Recordatorio de evaluaciones mensuales'
);

INSERT INTO `hr_announcements` (`company_id`, `title`, `announcement_type`, `content`, `audience_type`, `status`, `scheduled_for`, `published_at`, `created_by`)
SELECT 1,
       'Celebración de aniversarios del mes',
       'celebration',
       'Compartiremos los aniversarios y logros del mes en la reunión general de RH.',
       'employees',
       'draft',
       NULL,
       NULL,
       1
WHERE NOT EXISTS (
  SELECT 1
  FROM `hr_announcements`
  WHERE `company_id` = 1
    AND `title` = 'Celebración de aniversarios del mes'
);

INSERT INTO `hr_announcement_targets` (`announcement_id`, `target_type`, `target_value`)
SELECT a.`id`, 'unit', '5'
FROM `hr_announcements` a
WHERE a.`company_id` = 1
  AND a.`title` = 'Cambio de horario operativo'
  AND NOT EXISTS (
    SELECT 1
    FROM `hr_announcement_targets`
    WHERE `announcement_id` = a.`id`
      AND `target_type` = 'unit'
      AND `target_value` = '5'
  );

INSERT INTO `hr_announcement_targets` (`announcement_id`, `target_type`, `target_value`)
SELECT a.`id`, 'employee', '2'
FROM `hr_announcements` a
WHERE a.`company_id` = 1
  AND a.`title` = 'Celebración de aniversarios del mes'
  AND EXISTS (SELECT 1 FROM `hr_employees` e WHERE e.`id` = 2 AND e.`company_id` = 1)
  AND NOT EXISTS (
    SELECT 1
    FROM `hr_announcement_targets`
    WHERE `announcement_id` = a.`id`
      AND `target_type` = 'employee'
      AND `target_value` = '2'
  );
