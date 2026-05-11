SET @schema_name = DATABASE();

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'attendance_schedule_templates'
          AND COLUMN_NAME = 'schedule_mode'
    ),
    'SELECT 1',
    'ALTER TABLE attendance_schedule_templates ADD COLUMN schedule_mode varchar(20) NOT NULL DEFAULT ''strict'' AFTER status'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'attendance_schedule_templates'
          AND COLUMN_NAME = 'block_after_grace_period'
    ),
    'SELECT 1',
    'ALTER TABLE attendance_schedule_templates ADD COLUMN block_after_grace_period tinyint(1) NOT NULL DEFAULT 0 AFTER schedule_mode'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'attendance_schedule_templates'
          AND COLUMN_NAME = 'enforce_location'
    ),
    'SELECT 1',
    'ALTER TABLE attendance_schedule_templates ADD COLUMN enforce_location tinyint(1) NOT NULL DEFAULT 0 AFTER block_after_grace_period'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'attendance_schedule_templates'
          AND COLUMN_NAME = 'location_id'
    ),
    'SELECT 1',
    'ALTER TABLE attendance_schedule_templates ADD COLUMN location_id bigint DEFAULT NULL AFTER enforce_location'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'attendance_schedule_template_days'
          AND COLUMN_NAME = 'meal_minutes'
    ),
    'SELECT 1',
    'ALTER TABLE attendance_schedule_template_days ADD COLUMN meal_minutes int NOT NULL DEFAULT 0 AFTER end_time'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'attendance_schedule_template_days'
          AND COLUMN_NAME = 'rest_minutes'
    ),
    'SELECT 1',
    'ALTER TABLE attendance_schedule_template_days ADD COLUMN rest_minutes int NOT NULL DEFAULT 0 AFTER meal_minutes'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'user_attendance_daily_records'
          AND COLUMN_NAME = 'source_schedule_template_id'
    ),
    'SELECT 1',
    'ALTER TABLE user_attendance_daily_records ADD COLUMN source_schedule_template_id bigint DEFAULT NULL AFTER minutes_late'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'user_face_enrollments'
          AND COLUMN_NAME = 'expires_at'
    ),
    'SELECT 1',
    'ALTER TABLE user_face_enrollments ADD COLUMN expires_at datetime DEFAULT NULL AFTER created_by'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE OR REPLACE VIEW hr_users AS
SELECT uc.id AS id,
       uc.company_id AS company_id,
       uc.id AS user_company_id,
       u.id AS user_id,
       wp.id AS work_profile_id,
       COALESCE(wp.user_code, '') AS user_code,
       COALESCE(wp.user_code, '') AS employee_number,
       TRIM(COALESCE(NULLIF(up.full_name, ''), NULLIF(u.full_name, ''), u.email)) AS full_name,
       SUBSTRING_INDEX(TRIM(COALESCE(NULLIF(up.full_name, ''), NULLIF(u.full_name, ''), u.email)), ' ', 1) AS first_name,
       TRIM(
         SUBSTRING(
           TRIM(COALESCE(NULLIF(up.full_name, ''), NULLIF(u.full_name, ''), u.email)),
           CHAR_LENGTH(SUBSTRING_INDEX(TRIM(COALESCE(NULLIF(up.full_name, ''), NULLIF(u.full_name, ''), u.email)), ' ', 1)) + 1
         )
       ) AS last_name,
       u.email AS email,
       COALESCE(up.phone, '') AS phone,
       COALESCE(wp.position, '') AS position,
       COALESCE(wp.department, '') AS department,
       wp.unit_id AS unit_id,
       wp.business_id AS business_id,
       wp.hire_date AS hire_date,
       wp.salary AS salary,
       COALESCE(wp.pay_period, 'weekly') AS pay_period,
       COALESCE(wp.salary_type, 'daily') AS salary_type,
       wp.hourly_rate AS hourly_rate,
       COALESCE(wp.contract_type, 'permanent') AS contract_type,
       wp.contract_start_date AS contract_start_date,
       wp.contract_end_date AS contract_end_date,
       wp.termination_date AS termination_date,
       wp.last_working_day AS last_working_day,
       wp.termination_reason_type AS termination_reason_type,
       wp.termination_reason_code AS termination_reason_code,
       wp.termination_summary AS termination_summary,
       COALESCE(wp.date_of_birth, NULL) AS date_of_birth,
       COALESCE(wp.address, '') AS address,
       COALESCE(wp.national_id, '') AS national_id,
       COALESCE(wp.tax_id, '') AS tax_id,
       COALESCE(wp.social_security_number, '') AS social_security_number,
       COALESCE(wp.registration_country, '') AS registration_country,
       COALESCE(wp.state_province, '') AS state_province,
       COALESCE(wp.city, '') AS city,
       COALESCE(wp.postal_code, '') AS postal_code,
       COALESCE(wp.alternate_phone, '') AS alternate_phone,
       COALESCE(wp.emergency_contact_name, '') AS emergency_contact_name,
       COALESCE(wp.emergency_contact_relationship, '') AS emergency_contact_relationship,
       COALESCE(wp.emergency_contact_phone, '') AS emergency_contact_phone,
       COALESCE(wp.workday_hours, 8.00) AS workday_hours,
       COALESCE(wp.status, uc.status, 'active') AS status,
       wp.created_by AS created_by,
       COALESCE(wp.created_at, uc.created_at) AS created_at,
       wp.updated_at AS updated_at
FROM user_companies uc
JOIN users u
  ON u.id = uc.user_id
LEFT JOIN user_profiles up
  ON up.user_id = u.id
LEFT JOIN user_work_profiles wp
  ON wp.company_id = uc.company_id
 AND wp.user_company_id = uc.id;
