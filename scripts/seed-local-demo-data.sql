-- Local development seed data for Indice.
--
-- Usage:
--   docker exec -i indice-mysql-fresh mysql -u indice_user -pindice_pass -D indice_db < scripts/seed-local-demo-data.sql
--
-- Guardrails:
-- - Local/dev only.
-- - Does not write to flyway_schema_history.
-- - Uses synthetic names, hashes, object keys, and tokens.
-- - Keeps foreign key checks enabled so bad relationships fail immediately.

DELIMITER //
DROP PROCEDURE IF EXISTS assert_local_seed_database//
CREATE PROCEDURE assert_local_seed_database()
BEGIN
  IF DATABASE() <> 'indice_db' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Refusing to run local seed outside indice_db';
  END IF;
END//
CALL assert_local_seed_database()//
DROP PROCEDURE assert_local_seed_database//
DELIMITER ;

-- Long-lived local databases can predate the avatar object-storage columns.
-- Repair this small compatibility gap before the seed references them. The
-- production schema is still owned by Flyway; this guard only makes the local
-- demo seed recoverable when an older database was retained.
SET @has_avatar_object_key = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'user_profiles'
    AND column_name = 'avatar_object_key'
);
SET @seed_schema_sql = IF(
  @has_avatar_object_key = 0,
  'ALTER TABLE `user_profiles` ADD COLUMN `avatar_object_key` varchar(512) DEFAULT NULL',
  'SELECT 1'
);
PREPARE seed_schema_stmt FROM @seed_schema_sql;
EXECUTE seed_schema_stmt;
DEALLOCATE PREPARE seed_schema_stmt;

SET @has_avatar_content_type = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'user_profiles'
    AND column_name = 'avatar_content_type'
);
SET @seed_schema_sql = IF(
  @has_avatar_content_type = 0,
  'ALTER TABLE `user_profiles` ADD COLUMN `avatar_content_type` varchar(100) DEFAULT NULL',
  'SELECT 1'
);
PREPARE seed_schema_stmt FROM @seed_schema_sql;
EXECUTE seed_schema_stmt;
DEALLOCATE PREPARE seed_schema_stmt;

SET @has_avatar_updated_at = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'user_profiles'
    AND column_name = 'avatar_updated_at'
);
SET @seed_schema_sql = IF(
  @has_avatar_updated_at = 0,
  'ALTER TABLE `user_profiles` ADD COLUMN `avatar_updated_at` datetime DEFAULT NULL',
  'SELECT 1'
);
PREPARE seed_schema_stmt FROM @seed_schema_sql;
EXECUTE seed_schema_stmt;
DEALLOCATE PREPARE seed_schema_stmt;

SET @seed_password_hash = '$2y$12$4s7mj2iDLKOSDtJY9Zz5qukpJvNLtWAF87NhuEEF7kxuEH6G1r3ge';

DROP TEMPORARY TABLE IF EXISTS tmp_local_seed_companies;
CREATE TEMPORARY TABLE tmp_local_seed_companies (
  seed_no int PRIMARY KEY,
  name varchar(120) NOT NULL,
  logo_url varchar(255) NULL
);

INSERT INTO tmp_local_seed_companies (seed_no, name, logo_url) VALUES
  (1, 'Empresa Demo Spring', NULL),
  (2, 'Local Seed North Retail', NULL),
  (3, 'Local Seed Cancun Logistics', NULL),
  (4, 'Local Seed Monterrey Services', NULL);

DROP TEMPORARY TABLE IF EXISTS tmp_local_seed_people;
CREATE TEMPORARY TABLE tmp_local_seed_people (
  seed_no int PRIMARY KEY,
  email varchar(120) NOT NULL,
  full_name varchar(100) NOT NULL,
  phone varchar(50) NOT NULL,
  position_title varchar(100) NOT NULL,
  department varchar(100) NOT NULL,
  user_code varchar(50) NOT NULL
);

INSERT INTO tmp_local_seed_people (seed_no, email, full_name, phone, position_title, department, user_code) VALUES
  (1, 'demo@example.com', 'Usuario Demo', '+1-555-0101', 'Operations Lead', 'Operations', 'LSD-EMP-001'),
  (2, 'seed.alex.rivera@example.com', 'Alex Rivera', '+1-555-0102', 'Sales Coordinator', 'Sales', 'LSD-EMP-002'),
  (3, 'seed.maya.chen@example.com', 'Maya Chen', '+1-555-0103', 'Warehouse Supervisor', 'Logistics', 'LSD-EMP-003'),
  (4, 'seed.noah.patel@example.com', 'Noah Patel', '+1-555-0104', 'HR Generalist', 'Human Resources', 'LSD-EMP-004');

DROP TEMPORARY TABLE IF EXISTS tmp_local_seed_org;
CREATE TEMPORARY TABLE tmp_local_seed_org (
  seed_no int PRIMARY KEY,
  unit_name varchar(160) NOT NULL,
  business_name varchar(160) NOT NULL,
  location_name varchar(160) NOT NULL,
  latitude decimal(10,7) NOT NULL,
  longitude decimal(10,7) NOT NULL
);

INSERT INTO tmp_local_seed_org (seed_no, unit_name, business_name, location_name, latitude, longitude) VALUES
  (1, 'Spring Unit', 'Spring Biz A', 'Spring HQ', 25.6866140, -100.3161130),
  (2, 'Local Seed North Unit', 'Local Seed North Warehouse', 'Local Seed North Dock', 43.6532250, -79.3831860),
  (3, 'Local Seed Cancun Unit', 'Local Seed Cancun Headquarters', 'Local Seed Cancun Gate', 21.1619080, -86.8515280),
  (4, 'Local Seed Monterrey Unit', 'Local Seed Monterrey Service Hub', 'Local Seed Monterrey Desk', 25.6866140, -100.3161130);

START TRANSACTION;

INSERT INTO companies (name, logo_url)
SELECT c.name, c.logo_url
FROM tmp_local_seed_companies c
WHERE NOT EXISTS (
  SELECT 1 FROM companies existing WHERE existing.name = c.name
);

DROP TEMPORARY TABLE IF EXISTS tmp_local_seed_company_ids;
CREATE TEMPORARY TABLE tmp_local_seed_company_ids AS
SELECT c.seed_no, company.id AS company_id, c.name
FROM tmp_local_seed_companies c
JOIN companies company ON company.name = c.name;

SELECT company_id INTO @primary_company_id
FROM tmp_local_seed_company_ids
WHERE seed_no = 1
LIMIT 1;

INSERT INTO users (email, password_hash, full_name)
SELECT p.email, @seed_password_hash, p.full_name
FROM tmp_local_seed_people p
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  full_name = VALUES(full_name),
  updated_at = CURRENT_TIMESTAMP;

DROP TEMPORARY TABLE IF EXISTS tmp_local_seed_user_ids;
CREATE TEMPORARY TABLE tmp_local_seed_user_ids AS
SELECT p.seed_no, user_row.id AS user_id, p.email, p.full_name, p.phone, p.position_title, p.department, p.user_code
FROM tmp_local_seed_people p
JOIN users user_row ON user_row.email = p.email;

INSERT INTO user_profiles (
  user_id,
  full_name,
  phone,
  country,
  preferred_language,
  avatar_object_key,
  avatar_content_type,
  avatar_updated_at
)
SELECT
  u.user_id,
  u.full_name,
  u.phone,
  'CA',
  'en',
  CONCAT('local-seed/avatars/user-', u.seed_no, '.png'),
  'image/png',
  NOW()
FROM tmp_local_seed_user_ids u
ON DUPLICATE KEY UPDATE
  full_name = VALUES(full_name),
  phone = VALUES(phone),
  country = VALUES(country),
  preferred_language = VALUES(preferred_language),
  avatar_object_key = VALUES(avatar_object_key),
  avatar_content_type = VALUES(avatar_content_type),
  avatar_updated_at = VALUES(avatar_updated_at);

INSERT INTO user_companies (user_id, company_id, role, status, visibility)
SELECT
  u.user_id,
  @primary_company_id,
  CASE WHEN u.seed_no = 1 THEN 'superadmin' ELSE 'user' END,
  'active',
  'all'
FROM tmp_local_seed_user_ids u
ON DUPLICATE KEY UPDATE
  role = VALUES(role),
  status = VALUES(status),
  visibility = VALUES(visibility);

DROP TEMPORARY TABLE IF EXISTS tmp_local_seed_user_company_ids;
CREATE TEMPORARY TABLE tmp_local_seed_user_company_ids AS
SELECT
  u.seed_no,
  u.user_id,
  uc.id AS user_company_id,
  u.email,
  u.full_name,
  u.phone,
  u.position_title,
  u.department,
  u.user_code
FROM tmp_local_seed_user_ids u
JOIN user_companies uc
  ON uc.user_id = u.user_id
 AND uc.company_id = @primary_company_id;

SELECT user_id INTO @seed_admin_user_id
FROM tmp_local_seed_user_ids
WHERE seed_no = 1
LIMIT 1;

SELECT user_company_id, full_name INTO @seed_admin_user_company_id, @seed_admin_full_name
FROM tmp_local_seed_user_company_ids
WHERE seed_no = 1
LIMIT 1;

INSERT IGNORE INTO company_settings (company_id, settings_json)
SELECT
  c.company_id,
  JSON_OBJECT('seed', 'local-demo', 'company_seed_no', c.seed_no, 'timezone', 'America/Toronto')
FROM tmp_local_seed_company_ids c;

INSERT IGNORE INTO payroll_preferences (
  company_id,
  grouping_mode,
  default_daily_hours,
  pay_leave_days,
  isr_rate,
  imss_user_rate,
  infonavit_user_rate,
  imss_employer_rate,
  infonavit_employer_rate,
  sar_employer_rate
)
SELECT
  c.company_id,
  'single',
  8.00,
  1,
  0.10000,
  0.04000,
  0.03000,
  0.07000,
  0.05000,
  0.02000
FROM tmp_local_seed_company_ids c;

INSERT IGNORE INTO user_number_sequences (company_id, prefix, padding, next_number)
SELECT c.company_id, 'LSD', 4, 100
FROM tmp_local_seed_company_ids c;

INSERT INTO units (company_id, name, description, timezone, status)
SELECT
  @primary_company_id,
  org.unit_name,
  CONCAT('Local seed unit ', org.seed_no),
  'America/Toronto',
  'active'
FROM tmp_local_seed_org org
WHERE NOT EXISTS (
  SELECT 1 FROM units u
  WHERE u.company_id = @primary_company_id
    AND u.name = org.unit_name COLLATE utf8mb4_unicode_ci
);

DROP TEMPORARY TABLE IF EXISTS tmp_local_seed_unit_ids;
CREATE TEMPORARY TABLE tmp_local_seed_unit_ids AS
SELECT org.seed_no, unit_row.id AS unit_id, org.unit_name
FROM tmp_local_seed_org org
JOIN units unit_row
  ON unit_row.company_id = @primary_company_id
 AND unit_row.name = org.unit_name COLLATE utf8mb4_unicode_ci;

INSERT INTO businesses (
  company_id,
  unit_id,
  name,
  address,
  description,
  timezone,
  latitude,
  longitude,
  radius_meters,
  coordinate_source,
  status
)
SELECT
  @primary_company_id,
  unit_ids.unit_id,
  org.business_name,
  CONCAT(org.business_name, ' address'),
  CONCAT('Local seed business ', org.seed_no),
  'America/Toronto',
  org.latitude,
  org.longitude,
  120,
  'local_seed',
  'active'
FROM tmp_local_seed_org org
JOIN tmp_local_seed_unit_ids unit_ids ON unit_ids.seed_no = org.seed_no
WHERE NOT EXISTS (
  SELECT 1 FROM businesses b
  WHERE b.company_id = @primary_company_id
    AND b.name = org.business_name COLLATE utf8mb4_unicode_ci
);

DROP TEMPORARY TABLE IF EXISTS tmp_local_seed_business_ids;
CREATE TEMPORARY TABLE tmp_local_seed_business_ids AS
SELECT org.seed_no, business_row.id AS business_id, org.business_name
FROM tmp_local_seed_org org
JOIN businesses business_row
  ON business_row.company_id = @primary_company_id
 AND business_row.name = org.business_name COLLATE utf8mb4_unicode_ci;

INSERT INTO attendance_locations (
  company_id,
  unit_id,
  business_id,
  contract_start_date,
  contract_end_date,
  name,
  latitude,
  longitude,
  radius_meters,
  required_hours_per_day,
  required_start_time,
  required_end_time,
  required_days_per_week,
  status,
  managed_source,
  created_by
)
SELECT
  @primary_company_id,
  unit_ids.unit_id,
  business_ids.business_id,
  CURDATE(),
  DATE_ADD(CURDATE(), INTERVAL 1 YEAR),
  org.location_name,
  org.latitude,
  org.longitude,
  120,
  8.00,
  '08:00:00',
  '16:00:00',
  5,
  'active',
  'local_seed',
  @seed_admin_user_id
FROM tmp_local_seed_org org
JOIN tmp_local_seed_unit_ids unit_ids ON unit_ids.seed_no = org.seed_no
JOIN tmp_local_seed_business_ids business_ids ON business_ids.seed_no = org.seed_no
WHERE NOT EXISTS (
  SELECT 1 FROM attendance_locations l WHERE l.company_id = @primary_company_id AND l.name = org.location_name
);

DROP TEMPORARY TABLE IF EXISTS tmp_local_seed_location_ids;
CREATE TEMPORARY TABLE tmp_local_seed_location_ids AS
SELECT org.seed_no, location_row.id AS location_id, org.location_name
FROM tmp_local_seed_org org
JOIN attendance_locations location_row
  ON location_row.company_id = @primary_company_id
 AND location_row.name = org.location_name;

INSERT INTO attendance_kiosk_devices (
  company_id,
  unit_id,
  business_id,
  location_id,
  code,
  name,
  status,
  public_access_token,
  metadata_json,
  created_by
)
SELECT
  @primary_company_id,
  unit_ids.unit_id,
  business_ids.business_id,
  location_ids.location_id,
  CONCAT('local-seed-attendance-kiosk-', org.seed_no),
  CONCAT(org.location_name, ' Kiosk'),
  'active',
  SHA2(CONCAT('local-seed-attendance-kiosk-token-', org.seed_no), 256),
  JSON_OBJECT('seed', 'local-demo', 'supports_face_recognition', false),
  @seed_admin_user_id
FROM tmp_local_seed_org org
JOIN tmp_local_seed_unit_ids unit_ids ON unit_ids.seed_no = org.seed_no
JOIN tmp_local_seed_business_ids business_ids ON business_ids.seed_no = org.seed_no
JOIN tmp_local_seed_location_ids location_ids ON location_ids.seed_no = org.seed_no
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  status = VALUES(status),
  metadata_json = VALUES(metadata_json);

DROP TEMPORARY TABLE IF EXISTS tmp_local_seed_attendance_kiosk_ids;
CREATE TEMPORARY TABLE tmp_local_seed_attendance_kiosk_ids AS
SELECT org.seed_no, kiosk.id AS kiosk_device_id
FROM tmp_local_seed_org org
JOIN attendance_kiosk_devices kiosk
  ON kiosk.company_id = @primary_company_id
 AND kiosk.code = CONCAT('local-seed-attendance-kiosk-', org.seed_no);

INSERT INTO attendance_schedule_templates (
  company_id,
  name,
  status,
  schedule_mode,
  block_after_grace_period,
  enforce_location,
  location_id,
  created_by
)
SELECT
  @primary_company_id,
  CONCAT(org.unit_name, ' Local Seed Schedule'),
  'active',
  'strict',
  0,
  1,
  location_ids.location_id,
  @seed_admin_user_id
FROM tmp_local_seed_org org
JOIN tmp_local_seed_location_ids location_ids ON location_ids.seed_no = org.seed_no
WHERE NOT EXISTS (
  SELECT 1 FROM attendance_schedule_templates t
  WHERE t.company_id = @primary_company_id
    AND t.name = CONCAT(org.unit_name, ' Local Seed Schedule')
);

DROP TEMPORARY TABLE IF EXISTS tmp_local_seed_schedule_template_ids;
CREATE TEMPORARY TABLE tmp_local_seed_schedule_template_ids AS
SELECT org.seed_no, template.id AS template_id
FROM tmp_local_seed_org org
JOIN attendance_schedule_templates template
  ON template.company_id = @primary_company_id
 AND template.name = CONCAT(org.unit_name, ' Local Seed Schedule');

DROP TEMPORARY TABLE IF EXISTS tmp_local_seed_days;
CREATE TEMPORARY TABLE tmp_local_seed_days (day_of_week tinyint PRIMARY KEY);
INSERT INTO tmp_local_seed_days (day_of_week) VALUES (1), (2), (3), (4), (5);

INSERT IGNORE INTO attendance_schedule_template_days (
  template_id,
  day_of_week,
  start_time,
  end_time,
  meal_minutes,
  rest_minutes,
  late_after_minutes,
  is_rest_day
)
SELECT
  template_ids.template_id,
  days.day_of_week,
  '08:00:00',
  '16:00:00',
  30,
  15,
  10,
  0
FROM tmp_local_seed_schedule_template_ids template_ids
CROSS JOIN tmp_local_seed_days days;

INSERT INTO user_work_profiles (
  company_id,
  user_company_id,
  user_id,
  user_code,
  position,
  department,
  unit_id,
  business_id,
  hire_date,
  salary,
  pay_period,
  salary_type,
  hourly_rate,
  contract_type,
  contract_start_date,
  date_of_birth,
  address,
  national_id,
  tax_id,
  social_security_number,
  registration_country,
  state_province,
  city,
  postal_code,
  alternate_phone,
  emergency_contact_name,
  emergency_contact_relationship,
  emergency_contact_phone,
  workday_hours,
  status,
  created_by
)
SELECT
  @primary_company_id,
  uc.user_company_id,
  uc.user_id,
  uc.user_code,
  uc.position_title,
  uc.department,
  unit_ids.unit_id,
  business_ids.business_id,
  DATE_SUB(CURDATE(), INTERVAL (uc.seed_no * 30) DAY),
  42000 + (uc.seed_no * 2500),
  'weekly',
  'salary',
  32.50 + uc.seed_no,
  'permanent',
  DATE_SUB(CURDATE(), INTERVAL (uc.seed_no * 30) DAY),
  DATE_SUB(CURDATE(), INTERVAL (9000 + uc.seed_no) DAY),
  CONCAT(100 + uc.seed_no, ' Local Seed Street'),
  CONCAT('NID-LSD-', LPAD(uc.seed_no, 3, '0')),
  CONCAT('TAX-LSD-', LPAD(uc.seed_no, 3, '0')),
  CONCAT('SSN-LSD-', LPAD(uc.seed_no, 3, '0')),
  'CA',
  'ON',
  'Toronto',
  CONCAT('M5V ', uc.seed_no, 'A', uc.seed_no),
  CONCAT('+1-555-020', uc.seed_no),
  CONCAT('Emergency Contact ', uc.seed_no),
  'Family',
  CONCAT('+1-555-030', uc.seed_no),
  8.00,
  'active',
  @seed_admin_user_id
FROM tmp_local_seed_user_company_ids uc
JOIN tmp_local_seed_unit_ids unit_ids ON unit_ids.seed_no = uc.seed_no
JOIN tmp_local_seed_business_ids business_ids ON business_ids.seed_no = uc.seed_no
ON DUPLICATE KEY UPDATE
  position = VALUES(position),
  department = VALUES(department),
  unit_id = VALUES(unit_id),
  business_id = VALUES(business_id),
  status = VALUES(status);

INSERT INTO user_company_module_roles (user_company_id, module_slug, role, skill_level)
SELECT uc.user_company_id, module_row.slug, 'admin', 100
FROM tmp_local_seed_user_company_ids uc
JOIN modules module_row ON module_row.is_active = 1
WHERE uc.seed_no = 1
ON DUPLICATE KEY UPDATE
  role = VALUES(role),
  skill_level = VALUES(skill_level);

INSERT INTO user_company_module_roles (user_company_id, module_slug, role, skill_level)
SELECT uc.user_company_id, module_seed.module_slug, 'user', 1
FROM tmp_local_seed_user_company_ids uc
JOIN (
  SELECT 1 AS seed_no, 'human_resources' AS module_slug UNION ALL
  SELECT 2, 'crm' UNION ALL
  SELECT 3, 'processes' UNION ALL
  SELECT 4, 'config_center'
) module_seed ON module_seed.seed_no = uc.seed_no
WHERE uc.seed_no <> 1
ON DUPLICATE KEY UPDATE
  role = VALUES(role),
  skill_level = VALUES(skill_level);

INSERT INTO user_company_tab_permissions (user_company_id, module_slug, tab_key, can_view)
SELECT uc.user_company_id, tab_seed.module_slug, tab_seed.tab_key, 1
FROM tmp_local_seed_user_company_ids uc
CROSS JOIN (
  SELECT 'config_center' AS module_slug, 'profile' AS tab_key UNION ALL
  SELECT 'config_center', 'business-structure' UNION ALL
  SELECT 'config_center', 'business-profile' UNION ALL
  SELECT 'config_center', 'personal-performance' UNION ALL
  SELECT 'config_center', 'users' UNION ALL
  SELECT 'human_resources', 'collaborators' UNION ALL
  SELECT 'human_resources', 'attendance' UNION ALL
  SELECT 'human_resources', 'control' UNION ALL
  SELECT 'human_resources', 'payroll' UNION ALL
  SELECT 'human_resources', 'announcements' UNION ALL
  SELECT 'human_resources', 'assets' UNION ALL
  SELECT 'human_resources', 'records' UNION ALL
  SELECT 'human_resources', 'permissions' UNION ALL
  SELECT 'human_resources', 'incentives' UNION ALL
  SELECT 'human_resources', 'kpis'
) tab_seed
WHERE uc.seed_no = 1
ON DUPLICATE KEY UPDATE
  can_view = VALUES(can_view);

INSERT INTO user_company_tab_permissions (user_company_id, module_slug, tab_key, can_view)
SELECT uc.user_company_id, module_seed.module_slug, module_seed.tab_key, 1
FROM tmp_local_seed_user_company_ids uc
JOIN (
  SELECT 1 AS seed_no, 'human_resources' AS module_slug, 'control' AS tab_key UNION ALL
  SELECT 2, 'crm', 'contacts' UNION ALL
  SELECT 3, 'processes', 'tasks' UNION ALL
  SELECT 4, 'config_center', 'users'
) module_seed ON module_seed.seed_no = uc.seed_no
WHERE uc.seed_no <> 1
ON DUPLICATE KEY UPDATE
  can_view = VALUES(can_view);

INSERT IGNORE INTO user_module_favorites (user_id, module_slug)
SELECT u.user_id, favorite_seed.module_slug
FROM tmp_local_seed_user_ids u
JOIN (
  SELECT 1 AS seed_no, 'human_resources' AS module_slug UNION ALL
  SELECT 2, 'crm' UNION ALL
  SELECT 3, 'processes' UNION ALL
  SELECT 4, 'config_center'
) favorite_seed ON favorite_seed.seed_no = u.seed_no;

INSERT IGNORE INTO user_schedule_assignments (
  company_id,
  user_company_id,
  user_id,
  template_id,
  effective_start_date,
  status,
  created_by
)
SELECT
  @primary_company_id,
  uc.user_company_id,
  uc.user_id,
  template_ids.template_id,
  CURDATE(),
  'active',
  @seed_admin_user_id
FROM tmp_local_seed_user_company_ids uc
JOIN tmp_local_seed_schedule_template_ids template_ids ON template_ids.seed_no = uc.seed_no;

INSERT IGNORE INTO user_work_site_assignments (
  company_id,
  user_company_id,
  user_id,
  location_id,
  effective_start_date,
  status,
  created_by
)
SELECT
  @primary_company_id,
  uc.user_company_id,
  uc.user_id,
  location_ids.location_id,
  CURDATE(),
  'active',
  @seed_admin_user_id
FROM tmp_local_seed_user_company_ids uc
JOIN tmp_local_seed_location_ids location_ids ON location_ids.seed_no = uc.seed_no;

INSERT IGNORE INTO user_allowed_locations (
  company_id,
  user_company_id,
  user_id,
  location_id,
  status,
  created_by
)
SELECT
  @primary_company_id,
  uc.user_company_id,
  uc.user_id,
  location_ids.location_id,
  'active',
  @seed_admin_user_id
FROM tmp_local_seed_user_company_ids uc
JOIN tmp_local_seed_location_ids location_ids ON location_ids.seed_no = uc.seed_no;

INSERT INTO user_access_profiles (
  company_id,
  user_company_id,
  user_id,
  status,
  default_method,
  last_enrolled_at,
  metadata_json,
  created_by
)
SELECT
  @primary_company_id,
  uc.user_company_id,
  uc.user_id,
  'active',
  'pin',
  NOW(),
  JSON_OBJECT('seed', 'local-demo'),
  @seed_admin_user_id
FROM tmp_local_seed_user_company_ids uc
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  default_method = VALUES(default_method),
  metadata_json = VALUES(metadata_json);

DROP TEMPORARY TABLE IF EXISTS tmp_local_seed_access_profile_ids;
CREATE TEMPORARY TABLE tmp_local_seed_access_profile_ids AS
SELECT uc.seed_no, profile.id AS access_profile_id
FROM tmp_local_seed_user_company_ids uc
JOIN user_access_profiles profile
  ON profile.company_id = @primary_company_id
 AND profile.user_company_id = uc.user_company_id;

INSERT IGNORE INTO user_access_methods (
  company_id,
  access_profile_id,
  method_type,
  credential_ref,
  secret_hash,
  status,
  priority,
  metadata_json
)
SELECT
  @primary_company_id,
  profile_ids.access_profile_id,
  'pin',
  CONCAT('LSD-PIN-', LPAD(profile_ids.seed_no, 3, '0')),
  SHA2(CONCAT('local-seed-pin-', profile_ids.seed_no), 256),
  'active',
  10,
  JSON_OBJECT('seed', 'local-demo')
FROM tmp_local_seed_access_profile_ids profile_ids;

INSERT INTO user_assets (
  company_id,
  asset_code,
  asset_type,
  name,
  model,
  serial_number,
  responsible_user_company_id,
  responsible_user_id,
  unit_id,
  status,
  assigned_at,
  value_amount,
  notes,
  created_by_user_id,
  updated_by_user_id
)
SELECT
  @primary_company_id,
  CONCAT('LSD-ASSET-', LPAD(uc.seed_no, 3, '0')),
  CASE WHEN uc.seed_no = 1 THEN 'laptop' WHEN uc.seed_no = 2 THEN 'tablet' WHEN uc.seed_no = 3 THEN 'scanner' ELSE 'radio' END,
  CONCAT('Local Seed Asset ', uc.seed_no),
  CONCAT('Model ', uc.seed_no),
  CONCAT('LSD-SERIAL-', LPAD(uc.seed_no, 3, '0')),
  uc.user_company_id,
  uc.user_id,
  unit_ids.unit_id,
  CASE WHEN uc.seed_no = 3 THEN 'maintenance' ELSE 'assigned' END,
  NOW(),
  700 + (uc.seed_no * 125),
  'Local seed asset.',
  @seed_admin_user_id,
  @seed_admin_user_id
FROM tmp_local_seed_user_company_ids uc
JOIN tmp_local_seed_unit_ids unit_ids ON unit_ids.seed_no = uc.seed_no
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  responsible_user_company_id = VALUES(responsible_user_company_id),
  responsible_user_id = VALUES(responsible_user_id),
  status = VALUES(status),
  updated_by_user_id = VALUES(updated_by_user_id);

DROP TEMPORARY TABLE IF EXISTS tmp_local_seed_asset_ids;
CREATE TEMPORARY TABLE tmp_local_seed_asset_ids AS
SELECT uc.seed_no, asset.id AS asset_id
FROM tmp_local_seed_user_company_ids uc
JOIN user_assets asset
  ON asset.company_id = @primary_company_id
 AND asset.asset_code = CONCAT('LSD-ASSET-', LPAD(uc.seed_no, 3, '0'));

INSERT INTO user_asset_status_history (
  company_id,
  asset_id,
  from_status,
  to_status,
  change_reason,
  notes,
  changed_by_user_id
)
SELECT
  @primary_company_id,
  asset_ids.asset_id,
  NULL,
  CASE WHEN asset_ids.seed_no = 3 THEN 'maintenance' ELSE 'assigned' END,
  'local_seed',
  'Local seed asset status history.',
  @seed_admin_user_id
FROM tmp_local_seed_asset_ids asset_ids
WHERE NOT EXISTS (
  SELECT 1 FROM user_asset_status_history history
  WHERE history.company_id = @primary_company_id
    AND history.asset_id = asset_ids.asset_id
    AND history.change_reason = 'local_seed'
);

INSERT INTO user_asset_assignments (
  company_id,
  asset_id,
  responsible_user_company_id,
  responsible_user_id,
  unit_id,
  assignment_status,
  started_at,
  notes,
  created_by_user_id
)
SELECT
  @primary_company_id,
  asset_ids.asset_id,
  uc.user_company_id,
  uc.user_id,
  unit_ids.unit_id,
  CASE WHEN asset_ids.seed_no = 4 THEN 'custody' ELSE 'assigned' END,
  NOW(),
  'Local seed asset assignment.',
  @seed_admin_user_id
FROM tmp_local_seed_asset_ids asset_ids
JOIN tmp_local_seed_user_company_ids uc ON uc.seed_no = asset_ids.seed_no
JOIN tmp_local_seed_unit_ids unit_ids ON unit_ids.seed_no = asset_ids.seed_no
WHERE NOT EXISTS (
  SELECT 1 FROM user_asset_assignments assignment
  WHERE assignment.company_id = @primary_company_id
    AND assignment.asset_id = asset_ids.asset_id
    AND assignment.ended_at IS NULL
);

INSERT IGNORE INTO user_documents (
  company_id,
  user_company_id,
  user_id,
  document_type,
  original_filename,
  mime_type,
  size_bytes,
  object_key,
  status,
  uploaded_by_user_id
)
SELECT
  @primary_company_id,
  uc.user_company_id,
  uc.user_id,
  CONCAT('local_seed_doc_', uc.seed_no),
  CONCAT('local-seed-document-', uc.seed_no, '.pdf'),
  'application/pdf',
  1024 + uc.seed_no,
  CONCAT('local-seed/documents/user-', uc.seed_no, '.pdf'),
  'active',
  @seed_admin_user_id
FROM tmp_local_seed_user_company_ids uc;

INSERT IGNORE INTO user_attendance_daily_records (
  company_id,
  user_company_id,
  user_id,
  attendance_date,
  system_status,
  corrected_status,
  corrected_by,
  corrected_at,
  first_check_in_at,
  last_check_out_at,
  first_location_id,
  last_location_id,
  minutes_late,
  notes
)
SELECT
  @primary_company_id,
  uc.user_company_id,
  uc.user_id,
  DATE_SUB(CURDATE(), INTERVAL uc.seed_no DAY),
  CASE WHEN uc.seed_no = 2 THEN 'late' ELSE 'on_time' END,
  NULL,
  NULL,
  NULL,
  TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL uc.seed_no DAY), '08:00:00'),
  TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL uc.seed_no DAY), '16:00:00'),
  location_ids.location_id,
  location_ids.location_id,
  CASE WHEN uc.seed_no = 2 THEN 12 ELSE 0 END,
  'Local seed daily attendance record.'
FROM tmp_local_seed_user_company_ids uc
JOIN tmp_local_seed_location_ids location_ids ON location_ids.seed_no = uc.seed_no;

INSERT INTO user_attendance_events (
  company_id,
  user_company_id,
  user_id,
  event_type,
  event_timestamp,
  attendance_date,
  location_id,
  kiosk_device_id,
  latitude,
  longitude,
  source,
  auth_method,
  result_status,
  event_kind,
  notes,
  metadata_json,
  created_by
)
SELECT
  @primary_company_id,
  uc.user_company_id,
  uc.user_id,
  CASE WHEN uc.seed_no IN (2, 4) THEN 'check_out' ELSE 'check_in' END,
  TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL uc.seed_no DAY), CASE WHEN uc.seed_no IN (2, 4) THEN '16:00:00' ELSE '08:00:00' END),
  DATE_SUB(CURDATE(), INTERVAL uc.seed_no DAY),
  location_ids.location_id,
  kiosk_ids.kiosk_device_id,
  org.latitude,
  org.longitude,
  'kiosk',
  'pin',
  'accepted',
  'regular',
  'Local seed attendance event.',
  JSON_OBJECT('seed', 'local-demo'),
  @seed_admin_user_id
FROM tmp_local_seed_user_company_ids uc
JOIN tmp_local_seed_location_ids location_ids ON location_ids.seed_no = uc.seed_no
JOIN tmp_local_seed_attendance_kiosk_ids kiosk_ids ON kiosk_ids.seed_no = uc.seed_no
JOIN tmp_local_seed_org org ON org.seed_no = uc.seed_no
WHERE NOT EXISTS (
  SELECT 1 FROM user_attendance_events event
  WHERE event.company_id = @primary_company_id
    AND event.user_company_id = uc.user_company_id
    AND event.attendance_date = DATE_SUB(CURDATE(), INTERVAL uc.seed_no DAY)
    AND event.notes = 'Local seed attendance event.'
);

INSERT INTO user_face_enrollments (
  company_id,
  user_company_id,
  user_id,
  status,
  enrolled_at,
  created_by,
  expires_at
)
SELECT
  @primary_company_id,
  uc.user_company_id,
  uc.user_id,
  'active',
  NOW(),
  @seed_admin_user_id,
  DATE_ADD(NOW(), INTERVAL 90 DAY)
FROM tmp_local_seed_user_company_ids uc
WHERE NOT EXISTS (
  SELECT 1 FROM user_face_enrollments enrollment
  WHERE enrollment.company_id = @primary_company_id
    AND enrollment.user_company_id = uc.user_company_id
    AND enrollment.deleted_at IS NULL
);

DROP TEMPORARY TABLE IF EXISTS tmp_local_seed_face_enrollment_ids;
CREATE TEMPORARY TABLE tmp_local_seed_face_enrollment_ids AS
SELECT uc.seed_no, enrollment.id AS enrollment_id
FROM tmp_local_seed_user_company_ids uc
JOIN user_face_enrollments enrollment
  ON enrollment.company_id = @primary_company_id
 AND enrollment.user_company_id = uc.user_company_id
 AND enrollment.deleted_at IS NULL;

INSERT IGNORE INTO user_face_enrollment_captures (
  enrollment_id,
  capture_step,
  object_key,
  embedding_json,
  capture_metadata_json,
  status,
  processed_at
)
SELECT
  enrollment_ids.enrollment_id,
  CONCAT('front_', enrollment_ids.seed_no),
  CONCAT('local-seed/face/enrollment-', enrollment_ids.seed_no, '.jpg'),
  JSON_ARRAY(0.11, 0.22, 0.33),
  JSON_OBJECT('seed', 'local-demo'),
  'processed',
  NOW()
FROM tmp_local_seed_face_enrollment_ids enrollment_ids;

INSERT INTO user_face_verification_sessions (
  company_id,
  user_company_id,
  user_id,
  status,
  auth_method,
  challenge_sequence_json,
  liveness_result,
  verification_result,
  matched_score,
  created_by,
  expires_at,
  completed_at,
  consumed_at
)
SELECT
  @primary_company_id,
  uc.user_company_id,
  uc.user_id,
  'completed',
  'facial_recognition',
  JSON_ARRAY('front', 'left', 'right'),
  'passed',
  'matched',
  0.95000 + (uc.seed_no / 1000),
  @seed_admin_user_id,
  DATE_ADD(NOW(), INTERVAL 1 HOUR),
  NOW(),
  NOW()
FROM tmp_local_seed_user_company_ids uc
WHERE NOT EXISTS (
  SELECT 1 FROM user_face_verification_sessions session
  WHERE session.company_id = @primary_company_id
    AND session.user_company_id = uc.user_company_id
    AND session.status = 'completed'
    AND session.created_by = @seed_admin_user_id
);

DROP TEMPORARY TABLE IF EXISTS tmp_local_seed_face_session_ids;
CREATE TEMPORARY TABLE tmp_local_seed_face_session_ids AS
SELECT uc.seed_no, session.id AS session_id
FROM tmp_local_seed_user_company_ids uc
JOIN user_face_verification_sessions session
  ON session.company_id = @primary_company_id
 AND session.user_company_id = uc.user_company_id
 AND session.status = 'completed';

INSERT INTO user_face_verification_events (
  session_id,
  company_id,
  user_company_id,
  user_id,
  event_type,
  status,
  detail_json
)
SELECT
  session_ids.session_id,
  @primary_company_id,
  uc.user_company_id,
  uc.user_id,
  'local_seed_match',
  'success',
  JSON_OBJECT('seed', 'local-demo')
FROM tmp_local_seed_face_session_ids session_ids
JOIN tmp_local_seed_user_company_ids uc ON uc.seed_no = session_ids.seed_no
WHERE NOT EXISTS (
  SELECT 1 FROM user_face_verification_events event
  WHERE event.session_id = session_ids.session_id
    AND event.event_type = 'local_seed_match'
);

INSERT INTO company_business_profiles (
  company_id,
  version,
  status,
  started_at,
  completed_at,
  created_by,
  updated_by
)
SELECT
  c.company_id,
  1,
  'completed',
  NOW(),
  NOW(),
  @seed_admin_user_id,
  @seed_admin_user_id
FROM tmp_local_seed_company_ids c
WHERE NOT EXISTS (
  SELECT 1 FROM company_business_profiles profile
  WHERE profile.company_id = c.company_id
    AND profile.version = 1
);

DROP TEMPORARY TABLE IF EXISTS tmp_local_seed_business_profile_ids;
CREATE TEMPORARY TABLE tmp_local_seed_business_profile_ids AS
SELECT c.seed_no, profile.id AS business_profile_id
FROM tmp_local_seed_company_ids c
JOIN company_business_profiles profile
  ON profile.company_id = c.company_id
 AND profile.version = 1;

INSERT IGNORE INTO company_business_profile_answers (
  business_profile_id,
  section_key,
  status,
  completed_at,
  data
)
SELECT
  profile_ids.business_profile_id,
  CASE profile_ids.seed_no
    WHEN 1 THEN 'overview'
    WHEN 2 THEN 'operations'
    WHEN 3 THEN 'finance'
    ELSE 'people'
  END,
  'completed',
  NOW(),
  JSON_OBJECT('seed', 'local-demo', 'section', profile_ids.seed_no)
FROM tmp_local_seed_business_profile_ids profile_ids;

INSERT INTO user_personal_performance_profiles (
  user_id,
  company_id,
  version,
  status,
  started_at,
  completed_at
)
SELECT
  uc.user_id,
  @primary_company_id,
  1,
  'completed',
  NOW(),
  NOW()
FROM tmp_local_seed_user_company_ids uc
WHERE NOT EXISTS (
  SELECT 1 FROM user_personal_performance_profiles profile
  WHERE profile.user_id = uc.user_id
    AND profile.version = 1
);

DROP TEMPORARY TABLE IF EXISTS tmp_local_seed_performance_profile_ids;
CREATE TEMPORARY TABLE tmp_local_seed_performance_profile_ids AS
SELECT uc.seed_no, profile.id AS personal_performance_profile_id
FROM tmp_local_seed_user_company_ids uc
JOIN user_personal_performance_profiles profile
  ON profile.user_id = uc.user_id
 AND profile.version = 1;

INSERT IGNORE INTO user_personal_performance_answers (
  personal_performance_profile_id,
  section_key,
  status,
  completed_at,
  data
)
SELECT
  profile_ids.personal_performance_profile_id,
  CASE profile_ids.seed_no
    WHEN 1 THEN 'goals'
    WHEN 2 THEN 'skills'
    WHEN 3 THEN 'feedback'
    ELSE 'development'
  END,
  'completed',
  NOW(),
  JSON_OBJECT('seed', 'local-demo', 'score', 80 + profile_ids.seed_no)
FROM tmp_local_seed_performance_profile_ids profile_ids;

INSERT INTO hr_announcements (
  company_id,
  title,
  announcement_type,
  content,
  audience_type,
  status,
  published_at,
  created_by
)
SELECT
  @primary_company_id,
  CONCAT('Local Seed Announcement ', uc.seed_no),
  'general',
  CONCAT('Local seed announcement content ', uc.seed_no),
  'all',
  'published',
  NOW(),
  @seed_admin_user_id
FROM tmp_local_seed_user_company_ids uc
WHERE NOT EXISTS (
  SELECT 1 FROM hr_announcements announcement
  WHERE announcement.company_id = @primary_company_id
    AND announcement.title = CONCAT('Local Seed Announcement ', uc.seed_no)
);

DROP TEMPORARY TABLE IF EXISTS tmp_local_seed_announcement_ids;
CREATE TEMPORARY TABLE tmp_local_seed_announcement_ids AS
SELECT uc.seed_no, announcement.id AS announcement_id
FROM tmp_local_seed_user_company_ids uc
JOIN hr_announcements announcement
  ON announcement.company_id = @primary_company_id
 AND announcement.title = CONCAT('Local Seed Announcement ', uc.seed_no);

INSERT INTO hr_announcement_attachments (
  company_id,
  announcement_id,
  original_filename,
  mime_type,
  size_bytes,
  object_key,
  uploaded_by_user_id
)
SELECT
  @primary_company_id,
  announcement_ids.announcement_id,
  CONCAT('local-seed-announcement-', announcement_ids.seed_no, '.pdf'),
  'application/pdf',
  2048 + announcement_ids.seed_no,
  CONCAT('local-seed/announcements/', announcement_ids.seed_no, '.pdf'),
  @seed_admin_user_id
FROM tmp_local_seed_announcement_ids announcement_ids
WHERE NOT EXISTS (
  SELECT 1 FROM hr_announcement_attachments attachment
  WHERE attachment.announcement_id = announcement_ids.announcement_id
    AND attachment.object_key = CONCAT('local-seed/announcements/', announcement_ids.seed_no, '.pdf')
);

INSERT IGNORE INTO hr_announcement_deliveries (
  company_id,
  announcement_id,
  user_company_id,
  status,
  delivered_at,
  read_at
)
SELECT
  @primary_company_id,
  announcement_ids.announcement_id,
  uc.user_company_id,
  'delivered',
  NOW(),
  CASE WHEN uc.seed_no IN (1, 3) THEN NOW() ELSE NULL END
FROM tmp_local_seed_announcement_ids announcement_ids
JOIN tmp_local_seed_user_company_ids uc ON uc.seed_no = announcement_ids.seed_no;

INSERT IGNORE INTO hr_announcement_reads (
  company_id,
  announcement_id,
  user_company_id,
  user_id,
  read_at
)
SELECT
  @primary_company_id,
  announcement_ids.announcement_id,
  uc.user_company_id,
  uc.user_id,
  NOW()
FROM tmp_local_seed_announcement_ids announcement_ids
JOIN tmp_local_seed_user_company_ids uc ON uc.seed_no = announcement_ids.seed_no;

INSERT IGNORE INTO hr_announcement_targets (
  announcement_id,
  target_type,
  target_value
)
SELECT
  announcement_ids.announcement_id,
  'unit',
  CAST(unit_ids.unit_id AS CHAR)
FROM tmp_local_seed_announcement_ids announcement_ids
JOIN tmp_local_seed_unit_ids unit_ids ON unit_ids.seed_no = announcement_ids.seed_no;

INSERT INTO process_task_kiosks (
  company_id,
  unit_id,
  business_id,
  code,
  name,
  status,
  public_access_token,
  metadata_json,
  created_by
)
SELECT
  @primary_company_id,
  unit_ids.unit_id,
  business_ids.business_id,
  CONCAT('local-seed-process-kiosk-', org.seed_no),
  CONCAT(org.unit_name, ' Process Kiosk'),
  'active',
  SHA2(CONCAT('local-seed-process-kiosk-token-', org.seed_no), 256),
  JSON_OBJECT('seed', 'local-demo'),
  @seed_admin_user_id
FROM tmp_local_seed_org org
JOIN tmp_local_seed_unit_ids unit_ids ON unit_ids.seed_no = org.seed_no
JOIN tmp_local_seed_business_ids business_ids ON business_ids.seed_no = org.seed_no
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  metadata_json = VALUES(metadata_json);

INSERT INTO projects (
  company_id,
  folio,
  name,
  description,
  status,
  priority,
  owner_user_id,
  owner_user_company_id,
  owner_name,
  business_id,
  unit_id,
  start_date,
  due_date,
  created_by
)
SELECT
  @primary_company_id,
  CONCAT('LSD-PJ-', LPAD(uc.seed_no, 3, '0')),
  CONCAT('Local Seed Project ', uc.seed_no),
  'Local seed project.',
  'active',
  CASE WHEN uc.seed_no = 2 THEN 'high' ELSE 'medium' END,
  uc.user_id,
  uc.user_company_id,
  uc.full_name,
  business_ids.business_id,
  unit_ids.unit_id,
  CURDATE(),
  DATE_ADD(CURDATE(), INTERVAL (uc.seed_no * 7) DAY),
  @seed_admin_user_id
FROM tmp_local_seed_user_company_ids uc
JOIN tmp_local_seed_unit_ids unit_ids ON unit_ids.seed_no = uc.seed_no
JOIN tmp_local_seed_business_ids business_ids ON business_ids.seed_no = uc.seed_no
WHERE NOT EXISTS (
  SELECT 1 FROM projects project
  WHERE project.company_id = @primary_company_id
    AND project.folio = CONCAT('LSD-PJ-', LPAD(uc.seed_no, 3, '0'))
);

DROP TEMPORARY TABLE IF EXISTS tmp_local_seed_project_ids;
CREATE TEMPORARY TABLE tmp_local_seed_project_ids AS
SELECT uc.seed_no, project.id AS project_id
FROM tmp_local_seed_user_company_ids uc
JOIN projects project
  ON project.company_id = @primary_company_id
 AND project.folio = CONCAT('LSD-PJ-', LPAD(uc.seed_no, 3, '0'));

INSERT INTO processes (
  company_id,
  folio,
  unit_name,
  unit_id,
  business_name,
  business_id,
  title,
  description,
  task_title_template,
  task_description_template,
  frequency,
  priority,
  creator_user_id,
  creator_user_company_id,
  creator_name,
  responsible_name,
  responsible_user_company_id,
  recurrence_json,
  start_date,
  next_occurrence_date,
  is_active
)
SELECT
  @primary_company_id,
  CONCAT('LSD-PR-', LPAD(uc.seed_no, 3, '0')),
  unit_ids.unit_name,
  unit_ids.unit_id,
  business_ids.business_name,
  business_ids.business_id,
  CONCAT('Local Seed Process ', uc.seed_no),
  'Local seed process.',
  CONCAT('Local Seed Task Template ', uc.seed_no),
  'Local seed process task description.',
  CASE WHEN uc.seed_no IN (1, 3) THEN 'weekly' ELSE 'monthly' END,
  CASE WHEN uc.seed_no = 2 THEN 'high' ELSE 'medium' END,
  uc.user_id,
  uc.user_company_id,
  uc.full_name,
  uc.full_name,
  uc.user_company_id,
  JSON_OBJECT('seed', 'local-demo', 'interval', uc.seed_no),
  CURDATE(),
  DATE_ADD(CURDATE(), INTERVAL uc.seed_no DAY),
  1
FROM tmp_local_seed_user_company_ids uc
JOIN tmp_local_seed_unit_ids unit_ids ON unit_ids.seed_no = uc.seed_no
JOIN tmp_local_seed_business_ids business_ids ON business_ids.seed_no = uc.seed_no
WHERE NOT EXISTS (
  SELECT 1 FROM processes process
  WHERE process.company_id = @primary_company_id
    AND process.folio = CONCAT('LSD-PR-', LPAD(uc.seed_no, 3, '0'))
);

DROP TEMPORARY TABLE IF EXISTS tmp_local_seed_process_ids;
CREATE TEMPORARY TABLE tmp_local_seed_process_ids AS
SELECT uc.seed_no, process.id AS process_id
FROM tmp_local_seed_user_company_ids uc
JOIN processes process
  ON process.company_id = @primary_company_id
 AND process.folio = CONCAT('LSD-PR-', LPAD(uc.seed_no, 3, '0'));

INSERT INTO process_tasks (
  company_id,
  process_id,
  project_id,
  folio,
  title,
  description,
  assigned_user_id,
  assigned_user_company_id,
  assigned_name,
  status,
  priority,
  due_date,
  start_date,
  business_id,
  unit_id,
  notes,
  completion_percent,
  created_by
)
SELECT
  @primary_company_id,
  process_ids.process_id,
  project_ids.project_id,
  CONCAT('LSD-TASK-', LPAD(uc.seed_no, 3, '0')),
  CONCAT('Local Seed Task ', uc.seed_no),
  'Local seed process task.',
  uc.user_id,
  uc.user_company_id,
  uc.full_name,
  CASE WHEN uc.seed_no = 4 THEN 'completed' ELSE 'pending' END,
  CASE WHEN uc.seed_no = 2 THEN 'high' ELSE 'medium' END,
  DATE_ADD(CURDATE(), INTERVAL (uc.seed_no * 3) DAY),
  CURDATE(),
  business_ids.business_id,
  unit_ids.unit_id,
  'Local seed task notes.',
  CASE WHEN uc.seed_no = 4 THEN 100 ELSE uc.seed_no * 20 END,
  @seed_admin_user_id
FROM tmp_local_seed_user_company_ids uc
JOIN tmp_local_seed_process_ids process_ids ON process_ids.seed_no = uc.seed_no
JOIN tmp_local_seed_project_ids project_ids ON project_ids.seed_no = uc.seed_no
JOIN tmp_local_seed_business_ids business_ids ON business_ids.seed_no = uc.seed_no
JOIN tmp_local_seed_unit_ids unit_ids ON unit_ids.seed_no = uc.seed_no
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  status = VALUES(status),
  priority = VALUES(priority),
  completion_percent = VALUES(completion_percent);

DROP TEMPORARY TABLE IF EXISTS tmp_local_seed_task_ids;
CREATE TEMPORARY TABLE tmp_local_seed_task_ids AS
SELECT uc.seed_no, task.id AS task_id
FROM tmp_local_seed_user_company_ids uc
JOIN process_tasks task
  ON task.company_id = @primary_company_id
 AND task.folio = CONCAT('LSD-TASK-', LPAD(uc.seed_no, 3, '0'));

INSERT IGNORE INTO process_task_attachments (
  company_id,
  task_id,
  original_filename,
  mime_type,
  size_bytes,
  object_key,
  uploaded_by_user_id
)
SELECT
  @primary_company_id,
  task_ids.task_id,
  CONCAT('local-seed-task-', task_ids.seed_no, '.pdf'),
  'application/pdf',
  2048 + task_ids.seed_no,
  CONCAT('local-seed/process-tasks/', task_ids.seed_no, '.pdf'),
  @seed_admin_user_id
FROM tmp_local_seed_task_ids task_ids;

INSERT INTO sales_contacts (
  company_id,
  unit_id,
  business_id,
  contact_code,
  company_name,
  contact_person,
  phone,
  email,
  source,
  status,
  fiscal_country,
  fiscal_legal_name,
  fiscal_tax_id,
  fiscal_city,
  fiscal_state,
  fiscal_postal_code,
  owner_user_company_id,
  owner_name,
  notes,
  tags_json,
  metadata_json,
  created_by_user_id,
  updated_by_user_id
)
SELECT
  @primary_company_id,
  unit_ids.unit_id,
  business_ids.business_id,
  CONCAT('LSD-C-', LPAD(uc.seed_no, 3, '0')),
  CONCAT('Local Seed Client ', uc.seed_no),
  uc.full_name,
  uc.phone,
  CONCAT('client-', uc.seed_no, '@local-seed.example.com'),
  'local_seed',
  'active',
  'CA',
  CONCAT('Local Seed Client ', uc.seed_no, ' Ltd'),
  CONCAT('TAX-C-', LPAD(uc.seed_no, 3, '0')),
  'Toronto',
  'ON',
  'M5V',
  uc.user_company_id,
  uc.full_name,
  'Local seed sales contact.',
  JSON_ARRAY('local-seed'),
  JSON_OBJECT('seed', 'local-demo'),
  @seed_admin_user_id,
  @seed_admin_user_id
FROM tmp_local_seed_user_company_ids uc
JOIN tmp_local_seed_unit_ids unit_ids ON unit_ids.seed_no = uc.seed_no
JOIN tmp_local_seed_business_ids business_ids ON business_ids.seed_no = uc.seed_no
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  contact_person = VALUES(contact_person),
  owner_user_company_id = VALUES(owner_user_company_id),
  updated_by_user_id = VALUES(updated_by_user_id);

DROP TEMPORARY TABLE IF EXISTS tmp_local_seed_sales_contact_ids;
CREATE TEMPORARY TABLE tmp_local_seed_sales_contact_ids AS
SELECT uc.seed_no, contact.id AS contact_id
FROM tmp_local_seed_user_company_ids uc
JOIN sales_contacts contact
  ON contact.company_id = @primary_company_id
 AND contact.contact_code = CONCAT('LSD-C-', LPAD(uc.seed_no, 3, '0'));

INSERT INTO sales_products (
  company_id,
  product_code,
  sku,
  name,
  description,
  category,
  type,
  price,
  cost,
  currency,
  tax_category,
  status,
  visibility,
  inventory_ready,
  pos_ready,
  metadata_json,
  created_by_user_id,
  updated_by_user_id
)
SELECT
  @primary_company_id,
  CONCAT('LSD-PROD-', LPAD(uc.seed_no, 3, '0')),
  CONCAT('LSD-SKU-', LPAD(uc.seed_no, 3, '0')),
  CONCAT('Local Seed Product ', uc.seed_no),
  'Local seed sales product.',
  CASE WHEN uc.seed_no IN (1, 2) THEN 'Hardware' ELSE 'Service' END,
  CASE WHEN uc.seed_no = 4 THEN 'service' ELSE 'product' END,
  100 + (uc.seed_no * 25),
  60 + (uc.seed_no * 10),
  'CAD',
  'standard',
  'active',
  'commercial',
  1,
  1,
  JSON_OBJECT('seed', 'local-demo'),
  @seed_admin_user_id,
  @seed_admin_user_id
FROM tmp_local_seed_user_company_ids uc
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  price = VALUES(price),
  updated_by_user_id = VALUES(updated_by_user_id);

DROP TEMPORARY TABLE IF EXISTS tmp_local_seed_sales_product_ids;
CREATE TEMPORARY TABLE tmp_local_seed_sales_product_ids AS
SELECT uc.seed_no, product.id AS product_id
FROM tmp_local_seed_user_company_ids uc
JOIN sales_products product
  ON product.company_id = @primary_company_id
 AND product.product_code = CONCAT('LSD-PROD-', LPAD(uc.seed_no, 3, '0'));

INSERT INTO sales_opportunities (
  company_id,
  contact_id,
  unit_id,
  business_id,
  opportunity_code,
  opportunity_name,
  company_name,
  contact_person,
  phone,
  email,
  source,
  stage,
  temperature,
  status,
  owner_user_company_id,
  owner_name,
  estimated_value,
  currency,
  probability_percent,
  expected_close_date,
  next_action,
  next_action_at,
  notes,
  metadata_json,
  created_by_user_id,
  updated_by_user_id
)
SELECT
  @primary_company_id,
  contact_ids.contact_id,
  unit_ids.unit_id,
  business_ids.business_id,
  CONCAT('LSD-O-', LPAD(uc.seed_no, 3, '0')),
  CONCAT('Local Seed Opportunity ', uc.seed_no),
  CONCAT('Local Seed Client ', uc.seed_no),
  uc.full_name,
  uc.phone,
  CONCAT('client-', uc.seed_no, '@local-seed.example.com'),
  'local_seed',
  CASE WHEN uc.seed_no = 4 THEN 'proposal' ELSE 'new' END,
  'warm',
  'active',
  uc.user_company_id,
  uc.full_name,
  5000 + (uc.seed_no * 1250),
  'CAD',
  40 + (uc.seed_no * 10),
  DATE_ADD(CURDATE(), INTERVAL (uc.seed_no * 10) DAY),
  'Follow up',
  DATE_ADD(NOW(), INTERVAL uc.seed_no DAY),
  'Local seed opportunity.',
  JSON_OBJECT('seed', 'local-demo'),
  @seed_admin_user_id,
  @seed_admin_user_id
FROM tmp_local_seed_user_company_ids uc
JOIN tmp_local_seed_sales_contact_ids contact_ids ON contact_ids.seed_no = uc.seed_no
JOIN tmp_local_seed_unit_ids unit_ids ON unit_ids.seed_no = uc.seed_no
JOIN tmp_local_seed_business_ids business_ids ON business_ids.seed_no = uc.seed_no
ON DUPLICATE KEY UPDATE
  opportunity_name = VALUES(opportunity_name),
  stage = VALUES(stage),
  estimated_value = VALUES(estimated_value),
  updated_by_user_id = VALUES(updated_by_user_id);

DROP TEMPORARY TABLE IF EXISTS tmp_local_seed_sales_opportunity_ids;
CREATE TEMPORARY TABLE tmp_local_seed_sales_opportunity_ids AS
SELECT uc.seed_no, opportunity.id AS opportunity_id
FROM tmp_local_seed_user_company_ids uc
JOIN sales_opportunities opportunity
  ON opportunity.company_id = @primary_company_id
 AND opportunity.opportunity_code = CONCAT('LSD-O-', LPAD(uc.seed_no, 3, '0'));

INSERT INTO sales_quotes (
  company_id,
  contact_id,
  opportunity_id,
  quote_number,
  client_name,
  contact_person,
  status,
  amount,
  currency,
  created_date,
  expiration_date,
  assigned_seller_user_company_id,
  assigned_seller_name,
  notes,
  terms,
  connection_status,
  metadata_json,
  created_by_user_id,
  updated_by_user_id
)
SELECT
  @primary_company_id,
  contact_ids.contact_id,
  opportunity_ids.opportunity_id,
  CONCAT('LSD-Q-', LPAD(uc.seed_no, 3, '0')),
  CONCAT('Local Seed Client ', uc.seed_no),
  uc.full_name,
  CASE WHEN uc.seed_no = 3 THEN 'sent' ELSE 'draft' END,
  1250 + (uc.seed_no * 300),
  'CAD',
  CURDATE(),
  DATE_ADD(CURDATE(), INTERVAL 30 DAY),
  uc.user_company_id,
  uc.full_name,
  'Local seed quote.',
  'Local seed payment terms.',
  'commercial_quote',
  JSON_OBJECT('seed', 'local-demo'),
  @seed_admin_user_id,
  @seed_admin_user_id
FROM tmp_local_seed_user_company_ids uc
JOIN tmp_local_seed_sales_contact_ids contact_ids ON contact_ids.seed_no = uc.seed_no
JOIN tmp_local_seed_sales_opportunity_ids opportunity_ids ON opportunity_ids.seed_no = uc.seed_no
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  amount = VALUES(amount),
  updated_by_user_id = VALUES(updated_by_user_id);

DROP TEMPORARY TABLE IF EXISTS tmp_local_seed_sales_quote_ids;
CREATE TEMPORARY TABLE tmp_local_seed_sales_quote_ids AS
SELECT uc.seed_no, quote.id AS quote_id
FROM tmp_local_seed_user_company_ids uc
JOIN sales_quotes quote
  ON quote.company_id = @primary_company_id
 AND quote.quote_number = CONCAT('LSD-Q-', LPAD(uc.seed_no, 3, '0'));

INSERT INTO sales_quote_items (
  company_id,
  quote_id,
  product_id,
  section,
  product_name,
  sku,
  quantity,
  unit_price,
  discount_percent,
  tax_percent,
  line_total,
  sort_order,
  metadata_json
)
SELECT
  @primary_company_id,
  quote_ids.quote_id,
  product_ids.product_id,
  'Local Seed Items',
  CONCAT('Local Seed Product ', quote_ids.seed_no),
  CONCAT('LSD-SKU-', LPAD(quote_ids.seed_no, 3, '0')),
  quote_ids.seed_no,
  100 + (quote_ids.seed_no * 25),
  0.00,
  13.00,
  quote_ids.seed_no * (100 + (quote_ids.seed_no * 25)),
  quote_ids.seed_no,
  JSON_OBJECT('seed', 'local-demo')
FROM tmp_local_seed_sales_quote_ids quote_ids
JOIN tmp_local_seed_sales_product_ids product_ids ON product_ids.seed_no = quote_ids.seed_no
WHERE NOT EXISTS (
  SELECT 1 FROM sales_quote_items item
  WHERE item.company_id = @primary_company_id
    AND item.quote_id = quote_ids.quote_id
    AND item.product_id = product_ids.product_id
);

INSERT INTO sales_post_sale_cases (
  company_id,
  contact_id,
  opportunity_id,
  quote_id,
  case_number,
  client_name,
  relation_type,
  post_sale_type,
  status,
  owner_user_company_id,
  owner_name,
  last_purchase_date,
  next_follow_up_date,
  renewal_date,
  lifetime_value,
  currency,
  risk_level,
  next_action,
  notes,
  history_json,
  metadata_json,
  created_by_user_id,
  updated_by_user_id
)
SELECT
  @primary_company_id,
  contact_ids.contact_id,
  opportunity_ids.opportunity_id,
  quote_ids.quote_id,
  CONCAT('LSD-PSC-', LPAD(uc.seed_no, 3, '0')),
  CONCAT('Local Seed Client ', uc.seed_no),
  'one_time_customer',
  'standard',
  'active',
  uc.user_company_id,
  uc.full_name,
  DATE_SUB(CURDATE(), INTERVAL uc.seed_no DAY),
  DATE_ADD(CURDATE(), INTERVAL uc.seed_no DAY),
  DATE_ADD(CURDATE(), INTERVAL 1 YEAR),
  5000 + (uc.seed_no * 1000),
  'CAD',
  CASE WHEN uc.seed_no = 4 THEN 'medium' ELSE 'low' END,
  'Check satisfaction',
  'Local seed post-sale case.',
  JSON_ARRAY(JSON_OBJECT('seed', 'local-demo')),
  JSON_OBJECT('seed', 'local-demo'),
  @seed_admin_user_id,
  @seed_admin_user_id
FROM tmp_local_seed_user_company_ids uc
JOIN tmp_local_seed_sales_contact_ids contact_ids ON contact_ids.seed_no = uc.seed_no
JOIN tmp_local_seed_sales_opportunity_ids opportunity_ids ON opportunity_ids.seed_no = uc.seed_no
JOIN tmp_local_seed_sales_quote_ids quote_ids ON quote_ids.seed_no = uc.seed_no
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  next_follow_up_date = VALUES(next_follow_up_date),
  updated_by_user_id = VALUES(updated_by_user_id);

DROP TEMPORARY TABLE IF EXISTS tmp_local_seed_sales_post_sale_ids;
CREATE TEMPORARY TABLE tmp_local_seed_sales_post_sale_ids AS
SELECT uc.seed_no, post_sale.id AS post_sale_case_id
FROM tmp_local_seed_user_company_ids uc
JOIN sales_post_sale_cases post_sale
  ON post_sale.company_id = @primary_company_id
 AND post_sale.case_number = CONCAT('LSD-PSC-', LPAD(uc.seed_no, 3, '0'));

INSERT INTO sales_contracts (
  company_id,
  contact_id,
  opportunity_id,
  quote_id,
  post_sale_case_id,
  contract_number,
  title,
  client_name,
  contact_person,
  contract_type,
  status,
  signature_status,
  source,
  country,
  owner_user_company_id,
  owner_name,
  expiration_date,
  notes,
  metadata_json,
  created_by_user_id,
  updated_by_user_id
)
SELECT
  @primary_company_id,
  contact_ids.contact_id,
  opportunity_ids.opportunity_id,
  quote_ids.quote_id,
  post_sale_ids.post_sale_case_id,
  CONCAT('LSD-CTR-', LPAD(uc.seed_no, 3, '0')),
  CONCAT('Local Seed Contract ', uc.seed_no),
  CONCAT('Local Seed Client ', uc.seed_no),
  uc.full_name,
  'custom_contract',
  CASE WHEN uc.seed_no = 1 THEN 'active' ELSE 'draft' END,
  'not_requested',
  'uploaded',
  'CA',
  uc.user_company_id,
  uc.full_name,
  DATE_ADD(CURDATE(), INTERVAL 180 DAY),
  'Local seed contract.',
  JSON_OBJECT('seed', 'local-demo'),
  @seed_admin_user_id,
  @seed_admin_user_id
FROM tmp_local_seed_user_company_ids uc
JOIN tmp_local_seed_sales_contact_ids contact_ids ON contact_ids.seed_no = uc.seed_no
JOIN tmp_local_seed_sales_opportunity_ids opportunity_ids ON opportunity_ids.seed_no = uc.seed_no
JOIN tmp_local_seed_sales_quote_ids quote_ids ON quote_ids.seed_no = uc.seed_no
JOIN tmp_local_seed_sales_post_sale_ids post_sale_ids ON post_sale_ids.seed_no = uc.seed_no
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  owner_user_company_id = VALUES(owner_user_company_id),
  updated_by_user_id = VALUES(updated_by_user_id);

INSERT INTO sales_files (
  company_id,
  entity_type,
  entity_id,
  file_name,
  file_kind,
  file_status,
  source,
  object_key,
  metadata_json,
  created_by_user_id
)
SELECT
  @primary_company_id,
  'quote',
  quote_ids.quote_id,
  CONCAT('local-seed-sales-file-', quote_ids.seed_no, '.pdf'),
  'proposal',
  'active',
  'local_seed',
  CONCAT('local-seed/sales/', quote_ids.seed_no, '.pdf'),
  JSON_OBJECT('seed', 'local-demo'),
  @seed_admin_user_id
FROM tmp_local_seed_sales_quote_ids quote_ids
WHERE NOT EXISTS (
  SELECT 1 FROM sales_files file_row
  WHERE file_row.company_id = @primary_company_id
    AND file_row.entity_type = 'quote'
    AND file_row.entity_id = quote_ids.quote_id
    AND file_row.object_key = CONCAT('local-seed/sales/', quote_ids.seed_no, '.pdf')
);

INSERT INTO payroll_runs (
  company_id,
  grouping_mode,
  grouping_key,
  grouping_label,
  pay_period,
  period_start_date,
  period_end_date,
  status,
  users_count,
  gross_amount,
  deductions_amount,
  employer_contributions_amount,
  net_amount,
  created_by
)
SELECT
  @primary_company_id,
  'single',
  CONCAT('LSD-PAY-', LPAD(uc.seed_no, 3, '0')),
  CONCAT('Local Seed Payroll ', uc.seed_no),
  'weekly',
  DATE_SUB(CURDATE(), INTERVAL (7 + uc.seed_no) DAY),
  DATE_SUB(CURDATE(), INTERVAL uc.seed_no DAY),
  CASE WHEN uc.seed_no = 4 THEN 'approved' ELSE 'draft' END,
  1,
  1000 + (uc.seed_no * 100),
  120 + (uc.seed_no * 10),
  80 + (uc.seed_no * 10),
  880 + (uc.seed_no * 90),
  @seed_admin_user_id
FROM tmp_local_seed_user_company_ids uc
WHERE NOT EXISTS (
  SELECT 1 FROM payroll_runs run
  WHERE run.company_id = @primary_company_id
    AND run.grouping_key = CONCAT('LSD-PAY-', LPAD(uc.seed_no, 3, '0'))
);

DROP TEMPORARY TABLE IF EXISTS tmp_local_seed_payroll_run_ids;
CREATE TEMPORARY TABLE tmp_local_seed_payroll_run_ids AS
SELECT uc.seed_no, run.id AS run_id
FROM tmp_local_seed_user_company_ids uc
JOIN payroll_runs run
  ON run.company_id = @primary_company_id
 AND run.grouping_key = CONCAT('LSD-PAY-', LPAD(uc.seed_no, 3, '0'));

INSERT IGNORE INTO payroll_run_lines (
  run_id,
  company_id,
  user_company_id,
  user_id,
  user_code_snapshot,
  user_name_snapshot,
  position_title_snapshot,
  department_snapshot,
  unit_id_snapshot,
  unit_name_snapshot,
  business_id_snapshot,
  business_name_snapshot,
  pay_period_snapshot,
  salary_type_snapshot,
  base_salary_amount,
  hourly_rate_amount,
  days_payable,
  leave_days,
  absence_days,
  rest_days,
  late_count,
  regular_hours,
  overtime_hours,
  include_in_fiscal,
  gross_amount,
  deductions_amount,
  employer_contributions_amount,
  net_amount,
  notes
)
SELECT
  run_ids.run_id,
  @primary_company_id,
  uc.user_company_id,
  uc.user_id,
  uc.user_code,
  uc.full_name,
  uc.position_title,
  uc.department,
  unit_ids.unit_id,
  unit_ids.unit_name,
  business_ids.business_id,
  business_ids.business_name,
  'weekly',
  'salary',
  1000 + (uc.seed_no * 100),
  32.50 + uc.seed_no,
  5.00,
  0.00,
  0.00,
  2.00,
  CASE WHEN uc.seed_no = 2 THEN 1 ELSE 0 END,
  40.00,
  CASE WHEN uc.seed_no = 3 THEN 2.00 ELSE 0.00 END,
  1,
  1000 + (uc.seed_no * 100),
  120 + (uc.seed_no * 10),
  80 + (uc.seed_no * 10),
  880 + (uc.seed_no * 90),
  'Local seed payroll line.'
FROM tmp_local_seed_payroll_run_ids run_ids
JOIN tmp_local_seed_user_company_ids uc ON uc.seed_no = run_ids.seed_no
JOIN tmp_local_seed_unit_ids unit_ids ON unit_ids.seed_no = uc.seed_no
JOIN tmp_local_seed_business_ids business_ids ON business_ids.seed_no = uc.seed_no;

DROP TEMPORARY TABLE IF EXISTS tmp_local_seed_payroll_line_ids;
CREATE TEMPORARY TABLE tmp_local_seed_payroll_line_ids AS
SELECT uc.seed_no, line.id AS run_line_id
FROM tmp_local_seed_user_company_ids uc
JOIN tmp_local_seed_payroll_run_ids run_ids ON run_ids.seed_no = uc.seed_no
JOIN payroll_run_lines line
  ON line.run_id = run_ids.run_id
 AND line.user_company_id = uc.user_company_id;

INSERT INTO payroll_run_line_items (
  run_line_id,
  code,
  category,
  label,
  amount,
  source_type,
  display_order
)
SELECT
  line_ids.run_line_id,
  CONCAT('LSD-EARN-', LPAD(line_ids.seed_no, 3, '0')),
  'earning',
  CONCAT('Local Seed Earning ', line_ids.seed_no),
  1000 + (line_ids.seed_no * 100),
  'computed',
  line_ids.seed_no
FROM tmp_local_seed_payroll_line_ids line_ids
WHERE NOT EXISTS (
  SELECT 1 FROM payroll_run_line_items item
  WHERE item.run_line_id = line_ids.run_line_id
    AND item.code = CONCAT('LSD-EARN-', LPAD(line_ids.seed_no, 3, '0'))
);

INSERT IGNORE INTO user_password_reset_requests (
  email_hash,
  ip_hash,
  user_agent_hash,
  accepted,
  email_sent,
  blocked_reason
)
SELECT
  SHA2(CONCAT('local-seed-reset-email-', uc.seed_no), 256),
  SHA2(CONCAT('127.0.0.', uc.seed_no), 256),
  SHA2(CONCAT('local-seed-agent-', uc.seed_no), 256),
  1,
  0,
  NULL
FROM tmp_local_seed_user_company_ids uc;

INSERT IGNORE INTO user_password_reset_tokens (
  user_id,
  token_hash,
  status,
  expires_at,
  invalidated_at,
  requested_ip_hash,
  user_agent_hash
)
SELECT
  uc.user_id,
  SHA2(CONCAT('local-seed-reset-token-', uc.seed_no), 256),
  'expired',
  DATE_SUB(NOW(), INTERVAL uc.seed_no DAY),
  DATE_SUB(NOW(), INTERVAL uc.seed_no DAY),
  SHA2(CONCAT('127.0.0.', uc.seed_no), 256),
  SHA2(CONCAT('local-seed-agent-', uc.seed_no), 256)
FROM tmp_local_seed_user_company_ids uc;

INSERT INTO user_invitations (
  company_id,
  email,
  full_name,
  role,
  module_slugs_json,
  unit_id,
  business_id,
  token,
  status,
  invited_by,
  expires_at
)
SELECT
  @primary_company_id,
  CONCAT('invite-', uc.seed_no, '@local-seed.example.com'),
  CONCAT('Local Seed Invite ', uc.seed_no),
  'user',
  JSON_ARRAY('human_resources', 'crm'),
  unit_ids.unit_id,
  business_ids.business_id,
  SHA2(CONCAT('local-seed-invitation-token-', uc.seed_no), 256),
  'pending',
  @seed_admin_user_id,
  DATE_ADD(NOW(), INTERVAL 14 DAY)
FROM tmp_local_seed_user_company_ids uc
JOIN tmp_local_seed_unit_ids unit_ids ON unit_ids.seed_no = uc.seed_no
JOIN tmp_local_seed_business_ids business_ids ON business_ids.seed_no = uc.seed_no
ON DUPLICATE KEY UPDATE
  full_name = VALUES(full_name),
  module_slugs_json = VALUES(module_slugs_json),
  expires_at = VALUES(expires_at);

DROP TEMPORARY TABLE IF EXISTS tmp_local_seed_invitation_ids;
CREATE TEMPORARY TABLE tmp_local_seed_invitation_ids AS
SELECT uc.seed_no, invitation.id AS invitation_id
FROM tmp_local_seed_user_company_ids uc
JOIN user_invitations invitation
  ON invitation.company_id = @primary_company_id
 AND invitation.email = CONCAT('invite-', uc.seed_no, '@local-seed.example.com');

INSERT IGNORE INTO user_invitation_tab_permissions (
  invitation_id,
  module_slug,
  tab_key,
  can_view
)
SELECT
  invitation_ids.invitation_id,
  CASE WHEN invitation_ids.seed_no IN (1, 4) THEN 'human_resources' ELSE 'crm' END,
  CASE WHEN invitation_ids.seed_no IN (1, 4) THEN 'control' ELSE 'contacts' END,
  1
FROM tmp_local_seed_invitation_ids invitation_ids;

INSERT INTO user_permission_requests (
  company_id,
  request_number,
  user_company_id,
  user_id,
  user_name_snapshot,
  user_position_snapshot,
  user_department_snapshot,
  permission_type,
  start_date,
  end_date,
  requested_days,
  is_half_day,
  status,
  reason,
  review_notes,
  reviewed_by_user_id,
  reviewed_at,
  created_by_user_id,
  updated_by_user_id
)
SELECT
  @primary_company_id,
  CONCAT('LSD-PERM-', LPAD(uc.seed_no, 3, '0')),
  uc.user_company_id,
  uc.user_id,
  uc.full_name,
  uc.position_title,
  uc.department,
  CASE WHEN uc.seed_no = 2 THEN 'sick_leave' ELSE 'vacation' END,
  DATE_ADD(CURDATE(), INTERVAL uc.seed_no DAY),
  DATE_ADD(CURDATE(), INTERVAL (uc.seed_no + 1) DAY),
  2.0,
  0,
  CASE WHEN uc.seed_no = 3 THEN 'approved' ELSE 'pending' END,
  'Local seed permission request.',
  CASE WHEN uc.seed_no = 3 THEN 'Approved by local seed.' ELSE NULL END,
  CASE WHEN uc.seed_no = 3 THEN @seed_admin_user_id ELSE NULL END,
  CASE WHEN uc.seed_no = 3 THEN NOW() ELSE NULL END,
  uc.user_id,
  uc.user_id
FROM tmp_local_seed_user_company_ids uc
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  review_notes = VALUES(review_notes),
  updated_by_user_id = VALUES(updated_by_user_id);

DROP TEMPORARY TABLE IF EXISTS tmp_local_seed_permission_request_ids;
CREATE TEMPORARY TABLE tmp_local_seed_permission_request_ids AS
SELECT uc.seed_no, request.id AS permission_request_id
FROM tmp_local_seed_user_company_ids uc
JOIN user_permission_requests request
  ON request.company_id = @primary_company_id
 AND request.request_number = CONCAT('LSD-PERM-', LPAD(uc.seed_no, 3, '0'));

INSERT IGNORE INTO user_permission_attachments (
  company_id,
  permission_request_id,
  original_filename,
  mime_type,
  size_bytes,
  object_key,
  uploaded_by_user_id
)
SELECT
  @primary_company_id,
  request_ids.permission_request_id,
  CONCAT('local-seed-permission-', request_ids.seed_no, '.pdf'),
  'application/pdf',
  1000 + request_ids.seed_no,
  CONCAT('local-seed/permissions/', request_ids.seed_no, '.pdf'),
  @seed_admin_user_id
FROM tmp_local_seed_permission_request_ids request_ids;

INSERT INTO user_records (
  company_id,
  record_number,
  user_company_id,
  user_id,
  user_name_snapshot,
  user_position_snapshot,
  user_department_snapshot,
  user_unit_id_snapshot,
  user_unit_name_snapshot,
  user_business_id_snapshot,
  user_business_name_snapshot,
  record_type,
  severity,
  status,
  title,
  description,
  actions_taken,
  event_date,
  reported_by_user_id,
  reported_by_user_company_id,
  reported_by_name_snapshot,
  created_by_user_id,
  updated_by_user_id
)
SELECT
  @primary_company_id,
  CONCAT('LSD-REC-', LPAD(uc.seed_no, 3, '0')),
  uc.user_company_id,
  uc.user_id,
  uc.full_name,
  uc.position_title,
  uc.department,
  unit_ids.unit_id,
  unit_ids.unit_name,
  business_ids.business_id,
  business_ids.business_name,
  CASE WHEN uc.seed_no = 2 THEN 'incident' ELSE 'note' END,
  CASE WHEN uc.seed_no = 2 THEN 'medium' ELSE 'low' END,
  CASE WHEN uc.seed_no = 4 THEN 'closed' ELSE 'pending' END,
  CONCAT('Local Seed HR Record ', uc.seed_no),
  'Local seed HR record.',
  'Local seed action taken.',
  NOW(),
  @seed_admin_user_id,
  @seed_admin_user_company_id,
  @seed_admin_full_name,
  @seed_admin_user_id,
  @seed_admin_user_id
FROM tmp_local_seed_user_company_ids uc
JOIN tmp_local_seed_unit_ids unit_ids ON unit_ids.seed_no = uc.seed_no
JOIN tmp_local_seed_business_ids business_ids ON business_ids.seed_no = uc.seed_no
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  title = VALUES(title),
  updated_by_user_id = VALUES(updated_by_user_id);

DROP TEMPORARY TABLE IF EXISTS tmp_local_seed_record_ids;
CREATE TEMPORARY TABLE tmp_local_seed_record_ids AS
SELECT uc.seed_no, record_row.id AS record_id
FROM tmp_local_seed_user_company_ids uc
JOIN user_records record_row
  ON record_row.company_id = @primary_company_id
 AND record_row.record_number = CONCAT('LSD-REC-', LPAD(uc.seed_no, 3, '0'));

INSERT INTO user_record_activity (
  company_id,
  record_id,
  activity_type,
  from_status,
  to_status,
  note,
  actor_user_id,
  actor_name_snapshot
)
SELECT
  @primary_company_id,
  record_ids.record_id,
  'created',
  NULL,
  'pending',
  'Local seed record activity.',
  @seed_admin_user_id,
  @seed_admin_full_name
FROM tmp_local_seed_record_ids record_ids
WHERE NOT EXISTS (
  SELECT 1 FROM user_record_activity activity
  WHERE activity.record_id = record_ids.record_id
    AND activity.activity_type = 'created'
    AND activity.note = 'Local seed record activity.'
);

INSERT IGNORE INTO user_record_attachments (
  company_id,
  record_id,
  original_filename,
  mime_type,
  size_bytes,
  object_key,
  uploaded_by_user_id
)
SELECT
  @primary_company_id,
  record_ids.record_id,
  CONCAT('local-seed-record-', record_ids.seed_no, '.pdf'),
  'application/pdf',
  4096 + record_ids.seed_no,
  CONCAT('local-seed/records/', record_ids.seed_no, '.pdf'),
  @seed_admin_user_id
FROM tmp_local_seed_record_ids record_ids;

INSERT INTO user_record_witnesses (
  company_id,
  record_id,
  witness_user_company_id,
  witness_user_id,
  witness_name_snapshot
)
SELECT
  @primary_company_id,
  record_ids.record_id,
  uc.user_company_id,
  uc.user_id,
  uc.full_name
FROM tmp_local_seed_record_ids record_ids
JOIN tmp_local_seed_user_company_ids uc ON uc.seed_no = record_ids.seed_no
WHERE NOT EXISTS (
  SELECT 1 FROM user_record_witnesses witness
  WHERE witness.record_id = record_ids.record_id
    AND witness.witness_user_company_id = uc.user_company_id
);

COMMIT;

SELECT
  'local_demo_seed_complete' AS result,
  (SELECT COUNT(*) FROM companies) AS companies_count,
  (SELECT COUNT(*) FROM users) AS users_count,
  (SELECT COUNT(*) FROM user_companies) AS user_companies_count,
  (SELECT COUNT(*) FROM user_work_profiles) AS user_work_profiles_count,
  (SELECT COUNT(*) FROM sales_contacts) AS sales_contacts_count,
  (SELECT COUNT(*) FROM process_tasks) AS process_tasks_count;
