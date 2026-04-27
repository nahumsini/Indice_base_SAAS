-- HR UI test seed for local development.
--
-- Run after Flyway migrations have built the schema:
--   docker exec -i indice-erp-mysql-1 mysql -u indice_user -pindice_pass -D indice_db < scripts/seed-hr-ui-unscheduled.sql
--
-- Purpose:
-- - Seed a large HR Control dataset for UI testing.
-- - Keep every employee unscheduled.
-- - Provide schedule templates, locations, kiosks, access profiles, assets, and records for UI screens.
--
-- Important invariant:
-- - This script finishes with zero rows in hr_employee_schedule_assignments.
-- - This script finishes with zero rows in hr_employee_work_site_assignments.

SET @company_id := (SELECT id FROM companies ORDER BY id LIMIT 1);
SET @user_id := (SELECT id FROM users ORDER BY id LIMIT 1);

SET FOREIGN_KEY_CHECKS = 0;

DELETE t
FROM hr_announcement_targets t
JOIN hr_announcements a ON a.id = t.announcement_id
WHERE a.company_id = @company_id;
DELETE FROM hr_announcements WHERE company_id = @company_id;

DELETE FROM hr_asset_assignments WHERE company_id = @company_id;
DELETE FROM hr_asset_status_history WHERE company_id = @company_id;
DELETE FROM hr_assets WHERE company_id = @company_id;

DELETE FROM hr_payroll_run_line_items
WHERE run_line_id IN (
  SELECT id FROM hr_payroll_run_lines WHERE company_id = @company_id
);
DELETE FROM hr_payroll_run_lines WHERE company_id = @company_id;
DELETE FROM hr_payroll_runs WHERE company_id = @company_id;
DELETE FROM hr_payroll_preferences WHERE company_id = @company_id;

DELETE FROM hr_employee_record_activity WHERE company_id = @company_id;
DELETE FROM hr_employee_record_attachments WHERE company_id = @company_id;
DELETE FROM hr_employee_record_witnesses WHERE company_id = @company_id;
DELETE FROM hr_employee_records WHERE company_id = @company_id;

DELETE FROM hr_face_enrollment_captures
WHERE enrollment_id IN (
  SELECT id FROM hr_face_enrollments WHERE company_id = @company_id
);
DELETE FROM hr_face_verification_events WHERE company_id = @company_id;
DELETE FROM hr_face_verification_sessions WHERE company_id = @company_id;
DELETE FROM hr_face_enrollments WHERE company_id = @company_id;

DELETE FROM hr_employee_access_methods WHERE company_id = @company_id;
DELETE FROM hr_employee_access_profiles WHERE company_id = @company_id;
DELETE FROM hr_employee_allowed_locations WHERE company_id = @company_id;
DELETE FROM hr_employee_work_site_assignments WHERE company_id = @company_id;
DELETE FROM hr_employee_schedule_assignments WHERE company_id = @company_id;
DELETE FROM hr_attendance_events WHERE company_id = @company_id;
DELETE FROM hr_attendance_daily_records WHERE company_id = @company_id;

DELETE FROM hr_employee_documents WHERE company_id = @company_id;
DELETE FROM hr_employee_portal_access WHERE company_id = @company_id;
DELETE FROM hr_employee_profiles WHERE company_id = @company_id;
DELETE FROM hr_employees WHERE company_id = @company_id;
DELETE FROM hr_employee_number_sequences WHERE company_id = @company_id;

DELETE FROM hr_kiosk_devices WHERE company_id = @company_id;
DELETE FROM hr_schedule_template_days
WHERE template_id IN (
  SELECT id FROM hr_schedule_templates WHERE company_id = @company_id
);
DELETE FROM hr_schedule_templates WHERE company_id = @company_id;
DELETE FROM hr_attendance_locations WHERE company_id = @company_id;
DELETE FROM businesses WHERE company_id = @company_id;
DELETE FROM units WHERE company_id = @company_id;

SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO hr_payroll_preferences (
  company_id,
  grouping_mode,
  default_daily_hours,
  pay_leave_days,
  isr_rate,
  imss_employee_rate,
  infonavit_employee_rate,
  imss_employer_rate,
  infonavit_employer_rate,
  sar_employer_rate
)
VALUES (
  @company_id,
  'business',
  8.00,
  1,
  0.10000,
  0.04000,
  0.03000,
  0.07000,
  0.05000,
  0.02000
);

INSERT INTO user_company_module_roles (user_company_id, module_slug, role, skill_level)
SELECT uc.id, m.slug, 'admin', 5
FROM user_companies uc
JOIN modules m ON m.slug IN (
  'human_resources',
  'config_center',
  'inventory',
  'maintenance',
  'processes',
  'pos',
  'crm',
  'expenses'
)
WHERE uc.company_id = @company_id
  AND uc.user_id = @user_id
  AND NOT EXISTS (
    SELECT 1
    FROM user_company_module_roles existing
    WHERE existing.user_company_id = uc.id
      AND existing.module_slug = m.slug
  );

CREATE TEMPORARY TABLE tmp_hrui_unit_seed (
  unit_code varchar(20) PRIMARY KEY,
  name varchar(160) NOT NULL,
  timezone varchar(100) NOT NULL
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO tmp_hrui_unit_seed (unit_code, name, timezone) VALUES
  ('north', 'HR UI - North Operations Unit', 'America/Toronto'),
  ('south', 'HR UI - South Retail Unit', 'America/Toronto'),
  ('downtown', 'HR UI - Downtown Services Unit', 'America/Toronto'),
  ('logistics', 'HR UI - Logistics Unit', 'America/Toronto'),
  ('events', 'HR UI - Events Unit', 'America/Toronto'),
  ('external', 'HR UI - External Contracts Unit', 'America/Toronto');

INSERT INTO units (company_id, name, description, timezone, status)
SELECT @company_id, name, CONCAT('Seeded unit for HR UI testing: ', name), timezone, 'active'
FROM tmp_hrui_unit_seed;

CREATE TEMPORARY TABLE tmp_hrui_business_seed (
  unit_code varchar(20) NOT NULL,
  name varchar(160) NOT NULL,
  address varchar(255) NOT NULL
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO tmp_hrui_business_seed (unit_code, name, address) VALUES
  ('north', 'HR UI - North Food Court', '101 North Market Ave, Toronto, ON'),
  ('north', 'HR UI - North Warehouse', '145 North Industrial Rd, Toronto, ON'),
  ('north', 'HR UI - North Service Desk', '188 North Mall Blvd, Toronto, ON'),
  ('south', 'HR UI - South Grocery', '201 South Center St, Toronto, ON'),
  ('south', 'HR UI - South Cafe', '225 South Plaza, Toronto, ON'),
  ('south', 'HR UI - South Repair Counter', '240 South Terminal, Toronto, ON'),
  ('downtown', 'HR UI - Downtown Flagship', '310 King St W, Toronto, ON'),
  ('downtown', 'HR UI - Downtown Pop-up', '335 Queen St W, Toronto, ON'),
  ('downtown', 'HR UI - Downtown Call Desk', '360 Bay St, Toronto, ON'),
  ('logistics', 'HR UI - East Fulfillment', '410 Eastern Ave, Toronto, ON'),
  ('logistics', 'HR UI - West Dispatch', '440 Lakeshore Rd, Toronto, ON'),
  ('logistics', 'HR UI - Central Loading Bay', '470 Front St, Toronto, ON'),
  ('events', 'HR UI - Arena Event Stand', '510 Arena Way, Toronto, ON'),
  ('events', 'HR UI - Convention Booth', '540 Convention Rd, Toronto, ON'),
  ('events', 'HR UI - Weekend Festival Tent', '575 Festival Park, Toronto, ON'),
  ('external', 'HR UI - Client Alpha Site', '610 Client Alpha Dr, Toronto, ON'),
  ('external', 'HR UI - Client Beta Site', '640 Client Beta Dr, Toronto, ON'),
  ('external', 'HR UI - Client Gamma Site', '670 Client Gamma Dr, Toronto, ON');

INSERT INTO businesses (
  company_id,
  unit_id,
  name,
  address,
  description,
  timezone,
  status,
  created_by,
  updated_by
)
SELECT
  @company_id,
  u.id,
  b.name,
  b.address,
  CONCAT('Seeded business for HR UI testing: ', b.name),
  'America/Toronto',
  'active',
  @user_id,
  @user_id
FROM tmp_hrui_business_seed b
JOIN tmp_hrui_unit_seed us ON us.unit_code = b.unit_code
JOIN units u ON u.company_id = @company_id AND u.name = us.name;

CREATE TEMPORARY TABLE tmp_hrui_businesses AS
SELECT
  ROW_NUMBER() OVER (ORDER BY u.name, b.name) AS sort_order,
  b.id,
  b.name,
  b.unit_id,
  u.name AS unit_name
FROM businesses b
JOIN units u ON u.id = b.unit_id
WHERE b.company_id = @company_id
  AND b.name LIKE 'HR UI - %';

SET @hrui_business_count := (SELECT COUNT(*) FROM tmp_hrui_businesses);

INSERT INTO hr_attendance_locations (
  company_id,
  unit_id,
  business_id,
  name,
  latitude,
  longitude,
  radius_meters,
  status,
  created_by
)
SELECT
  @company_id,
  b.unit_id,
  b.id,
  CONCAT(b.name, ' Attendance Site'),
  43.6400000 + (b.sort_order * 0.0041000),
  -79.4100000 - (b.sort_order * 0.0037000),
  120 + (b.sort_order % 4) * 25,
  'active',
  @user_id
FROM tmp_hrui_businesses b;

INSERT INTO hr_attendance_locations (
  company_id,
  unit_id,
  business_id,
  name,
  latitude,
  longitude,
  radius_meters,
  status,
  created_by
)
VALUES
  (@company_id, NULL, NULL, 'HR UI - External Client HQ', 43.6532200, -79.3831800, 180, 'active', @user_id),
  (@company_id, NULL, NULL, 'HR UI - Airport Pop-up Stand', 43.6777200, -79.6248200, 220, 'active', @user_id),
  (@company_id, NULL, NULL, 'HR UI - Remote Warehouse Gate', 43.7001100, -79.5123300, 200, 'active', @user_id),
  (@company_id, NULL, NULL, 'HR UI - Weekend Event Hall', 43.6425700, -79.3870600, 160, 'active', @user_id),
  (@company_id, NULL, NULL, 'HR UI - Backup Training Room', 43.6653000, -79.3951000, 90, 'active', @user_id),
  (@company_id, NULL, NULL, 'HR UI - Inactive Old Site', 43.6203000, -79.4015000, 100, 'inactive', @user_id);

CREATE TEMPORARY TABLE tmp_hrui_numbers (n int PRIMARY KEY);

INSERT INTO tmp_hrui_numbers (n) VALUES
  (1),(2),(3),(4),(5),(6),(7),(8),(9),(10),(11),(12),
  (13),(14),(15),(16),(17),(18),(19),(20),(21),(22),(23),(24),
  (25),(26),(27),(28),(29),(30),(31),(32),(33),(34),(35),(36),
  (37),(38),(39),(40),(41),(42),(43),(44),(45),(46),(47),(48),
  (49),(50),(51),(52),(53),(54),(55),(56),(57),(58),(59),(60),
  (61),(62),(63),(64),(65),(66),(67),(68),(69),(70),(71),(72);

INSERT INTO hr_employees (
  company_id,
  employee_number,
  first_name,
  last_name,
  email,
  phone,
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
  contract_end_date,
  termination_date,
  last_working_day,
  termination_reason_type,
  termination_reason_code,
  termination_summary,
  status,
  created_by
)
SELECT
  @company_id,
  CONCAT('HRUI-', LPAD(n.n, 4, '0')),
  ELT(1 + MOD(n.n - 1, 24),
    'Ariana', 'Mateo', 'Priya', 'Noah', 'Maya', 'Lucas', 'Sofia', 'Ethan',
    'Isabella', 'Liam', 'Olivia', 'Daniel', 'Amelia', 'Leo', 'Nora', 'Gabriel',
    'Chloe', 'Mason', 'Zoe', 'Owen', 'Mila', 'Julian', 'Ella', 'Theo'
  ),
  ELT(1 + MOD((n.n * 7) - 1, 24),
    'Collins', 'Rivera', 'Patel', 'Morgan', 'Singh', 'Brown', 'Garcia', 'Wilson',
    'Chen', 'Johnson', 'Lopez', 'Davis', 'Khan', 'Martinez', 'Taylor', 'Anderson',
    'Thomas', 'Moore', 'Nguyen', 'Martin', 'Lee', 'Walker', 'Hall', 'Young'
  ),
  CONCAT('hrui.employee', LPAD(n.n, 4, '0'), '@example.test'),
  CONCAT('+1-416-555-', LPAD(1000 + n.n, 4, '0')),
  ELT(1 + MOD(n.n - 1, 12),
    'Cashier', 'Line Cook', 'Warehouse Associate', 'Shift Lead', 'Event Crew',
    'Service Desk Agent', 'Inventory Clerk', 'Runner', 'Coordinator',
    'Customer Host', 'Dispatcher', 'Technician'
  ),
  ELT(1 + MOD(n.n - 1, 8),
    'Operations', 'Food Service', 'Logistics', 'Customer Support',
    'Events', 'Inventory', 'Field Service', 'Administration'
  ),
  b.unit_id,
  b.id,
  DATE_SUB(CURDATE(), INTERVAL (45 + n.n) DAY),
  CASE WHEN MOD(n.n, 2) = 0 THEN 42000 + (n.n * 510) ELSE NULL END,
  CASE WHEN MOD(n.n, 3) = 0 THEN 'biweekly' WHEN MOD(n.n, 3) = 1 THEN 'weekly' ELSE 'monthly' END,
  CASE WHEN MOD(n.n, 2) = 0 THEN 'daily' ELSE 'hourly' END,
  CASE WHEN MOD(n.n, 2) = 1 THEN 18.50 + MOD(n.n, 9) ELSE NULL END,
  CASE WHEN MOD(n.n, 5) = 0 THEN 'temporary' ELSE 'permanent' END,
  DATE_SUB(CURDATE(), INTERVAL (45 + n.n) DAY),
  CASE WHEN MOD(n.n, 5) = 0 THEN DATE_ADD(CURDATE(), INTERVAL (45 + n.n) DAY) ELSE NULL END,
  CASE WHEN n.n >= 71 THEN DATE_SUB(CURDATE(), INTERVAL 7 DAY) ELSE NULL END,
  CASE WHEN n.n >= 71 THEN DATE_SUB(CURDATE(), INTERVAL 7 DAY) ELSE NULL END,
  CASE WHEN n.n >= 71 THEN 'contract_end' ELSE NULL END,
  CASE WHEN n.n >= 71 THEN 'seed-ended-contract' ELSE NULL END,
  CASE WHEN n.n >= 71 THEN 'Seed terminated employee for UI testing.' ELSE NULL END,
  CASE WHEN n.n IN (69, 70) THEN 'inactive' WHEN n.n >= 71 THEN 'terminated' ELSE 'active' END,
  @user_id
FROM tmp_hrui_numbers n
JOIN tmp_hrui_businesses b ON b.sort_order = 1 + MOD(n.n - 1, @hrui_business_count);

INSERT INTO hr_employee_profiles (
  employee_id,
  company_id,
  date_of_birth,
  address,
  national_id,
  tax_id,
  social_security_number,
  registration_country,
  state_province,
  alternate_phone,
  emergency_contact_name,
  emergency_contact_relationship,
  emergency_contact_phone,
  workday_hours
)
SELECT
  e.id,
  @company_id,
  DATE_SUB('1998-01-01', INTERVAL MOD(CAST(SUBSTRING(e.employee_number, 6) AS UNSIGNED) * 137, 5000) DAY),
  CONCAT(CAST(SUBSTRING(e.employee_number, 6) AS UNSIGNED) + 100, ' Seed Street, Toronto, ON'),
  CONCAT('NID-HRUI-', SUBSTRING(e.employee_number, 6)),
  CONCAT('TAX-HRUI-', SUBSTRING(e.employee_number, 6)),
  CONCAT('SSN-HRUI-', SUBSTRING(e.employee_number, 6)),
  'CA',
  'Ontario',
  CONCAT('+1-647-555-', SUBSTRING(e.employee_number, 6)),
  CONCAT('Emergency Contact ', SUBSTRING(e.employee_number, 6)),
  'Family',
  CONCAT('+1-905-555-', SUBSTRING(e.employee_number, 6)),
  CASE WHEN MOD(CAST(SUBSTRING(e.employee_number, 6) AS UNSIGNED), 4) = 0 THEN 7.50 ELSE 8.00 END
FROM hr_employees e
WHERE e.company_id = @company_id
  AND e.employee_number LIKE 'HRUI-%';

INSERT INTO hr_employee_portal_access (
  employee_id,
  company_id,
  access_role,
  linked_user_id,
  invitation_status,
  created_by
)
SELECT
  e.id,
  @company_id,
  CASE
    WHEN CAST(SUBSTRING(e.employee_number, 6) AS UNSIGNED) IN (1, 2, 3) THEN 'coordinator'
    WHEN CAST(SUBSTRING(e.employee_number, 6) AS UNSIGNED) IN (4, 5, 6) THEN 'manager'
    ELSE 'employee'
  END,
  NULL,
  'not_invited',
  @user_id
FROM hr_employees e
WHERE e.company_id = @company_id
  AND e.employee_number LIKE 'HRUI-%';

INSERT INTO hr_employee_number_sequences (company_id, prefix, padding, next_number)
VALUES (@company_id, 'EMP-', 4, 1);

INSERT INTO hr_schedule_templates (
  company_id,
  name,
  status,
  schedule_mode,
  block_after_grace_period,
  enforce_location,
  location_id,
  created_by
)
VALUES
  (@company_id, 'HR UI - Morning Shift', 'active', 'strict', 0, 0, NULL, @user_id),
  (@company_id, 'HR UI - Midday Shift', 'active', 'strict', 0, 0, NULL, @user_id),
  (@company_id, 'HR UI - Evening Shift', 'active', 'strict', 1, 0, NULL, @user_id),
  (@company_id, 'HR UI - Open Flex', 'active', 'open', 0, 0, NULL, @user_id),
  (@company_id, 'HR UI - Inactive Old Shift', 'inactive', 'strict', 0, 0, NULL, @user_id);

CREATE TEMPORARY TABLE tmp_hrui_days (day_of_week int PRIMARY KEY);
INSERT INTO tmp_hrui_days (day_of_week) VALUES (1),(2),(3),(4),(5),(6),(7);

INSERT INTO hr_schedule_template_days (
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
  t.id,
  d.day_of_week,
  CASE
    WHEN d.day_of_week >= 6 THEN NULL
    WHEN t.name = 'HR UI - Morning Shift' THEN '08:00:00'
    WHEN t.name = 'HR UI - Midday Shift' THEN '10:00:00'
    WHEN t.name = 'HR UI - Evening Shift' THEN '14:00:00'
    WHEN t.name = 'HR UI - Inactive Old Shift' THEN '09:00:00'
    ELSE NULL
  END,
  CASE
    WHEN d.day_of_week >= 6 THEN NULL
    WHEN t.name = 'HR UI - Morning Shift' THEN '16:00:00'
    WHEN t.name = 'HR UI - Midday Shift' THEN '18:00:00'
    WHEN t.name = 'HR UI - Evening Shift' THEN '22:00:00'
    WHEN t.name = 'HR UI - Inactive Old Shift' THEN '17:00:00'
    ELSE NULL
  END,
  CASE WHEN d.day_of_week >= 6 THEN 0 ELSE 30 END,
  CASE WHEN d.day_of_week >= 6 THEN 0 ELSE 15 END,
  10,
  CASE WHEN d.day_of_week >= 6 THEN 1 ELSE 0 END
FROM hr_schedule_templates t
JOIN tmp_hrui_days d
WHERE t.company_id = @company_id
  AND t.name LIKE 'HR UI - %';

INSERT INTO hr_employee_allowed_locations (
  company_id,
  employee_id,
  location_id,
  status,
  created_by
)
SELECT
  @company_id,
  e.id,
  l.id,
  'active',
  @user_id
FROM hr_employees e
JOIN hr_attendance_locations l
  ON l.company_id = @company_id
  AND l.business_id = e.business_id
  AND l.status = 'active'
WHERE e.company_id = @company_id
  AND e.status = 'active'
  AND e.employee_number LIKE 'HRUI-%';

INSERT INTO hr_employee_allowed_locations (
  company_id,
  employee_id,
  location_id,
  status,
  created_by
)
SELECT
  @company_id,
  e.id,
  l.id,
  'active',
  @user_id
FROM hr_employees e
JOIN hr_attendance_locations l
  ON l.company_id = @company_id
  AND l.name = CASE
    WHEN MOD(CAST(SUBSTRING(e.employee_number, 6) AS UNSIGNED), 5) = 0 THEN 'HR UI - External Client HQ'
    WHEN MOD(CAST(SUBSTRING(e.employee_number, 6) AS UNSIGNED), 5) = 1 THEN 'HR UI - Airport Pop-up Stand'
    WHEN MOD(CAST(SUBSTRING(e.employee_number, 6) AS UNSIGNED), 5) = 2 THEN 'HR UI - Remote Warehouse Gate'
    WHEN MOD(CAST(SUBSTRING(e.employee_number, 6) AS UNSIGNED), 5) = 3 THEN 'HR UI - Weekend Event Hall'
    ELSE 'HR UI - Backup Training Room'
  END
WHERE e.company_id = @company_id
  AND e.status = 'active'
  AND e.employee_number LIKE 'HRUI-%';

INSERT INTO hr_kiosk_devices (
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
  @company_id,
  l.unit_id,
  l.business_id,
  l.id,
  CONCAT('HRUI-KIOSK-', LPAD(ROW_NUMBER() OVER (ORDER BY l.id), 2, '0')),
  CONCAT(REPLACE(l.name, ' Attendance Site', ''), ' Kiosk'),
  'active',
  CONCAT('hrui-public-token-', LPAD(ROW_NUMBER() OVER (ORDER BY l.id), 2, '0'), '-seed'),
  JSON_OBJECT('supports_face_recognition', true, 'seed', 'hr-ui-unscheduled'),
  @user_id
FROM hr_attendance_locations l
WHERE l.company_id = @company_id
  AND l.status = 'active'
  AND l.business_id IS NOT NULL
ORDER BY l.id
LIMIT 8;

CREATE TEMPORARY TABLE tmp_hrui_pins (
  employee_number varchar(20) PRIMARY KEY,
  plain_pin varchar(10) NOT NULL,
  credential_ref varchar(120) NOT NULL,
  secret_hash varchar(255) NOT NULL
);

INSERT INTO tmp_hrui_pins (employee_number, plain_pin, credential_ref, secret_hash) VALUES
  ('HRUI-0001', '4101', 'pin:v1:BP4XWnDrWwo_4cIzZlQP0ywVW8sSC9ltyIOtjZB66qU', '$2a$10$iXpM1gc5RnSPsgIgs8K0leZmQVGa6.mRtpFimF2PXhDV3VaBzvASO'),
  ('HRUI-0002', '4102', 'pin:v1:Tyvm8eGRrviHWih8KsC_zFD7L058H2bODahyea0eTgM', '$2a$10$kvURdHL.2G3g8tujk0/5oOmUXIZ55/UTlG7d8gE.rbMqWT73rsY8K'),
  ('HRUI-0003', '4103', 'pin:v1:0o4vzKQxr1V_LxGJjFYfJ0BfrQMVZatS26SrpkCstEQ', '$2a$10$CeLJJvuZW1g1ZSSB5s2NEuBgTVwQcY9loEFNZGHzQKGvSO2Xk8EGC'),
  ('HRUI-0004', '4104', 'pin:v1:ai8qY0t0GAqxxBXzmNKYsCQjbdcQl-ZckkDoysO8pKE', '$2a$10$A5qc8fBcDyA3pEixgrRpZeGym8myTY0jze79jWyDfwwOfohuYK2U.'),
  ('HRUI-0005', '4105', 'pin:v1:NmFrwtyCh83TFlh-HSMgpXdZ6I33wfWPTezg1dpcvzA', '$2a$10$GdB7pO.y88XPv6k4QewkIexOPpT91XHFsW0UFxQOL940c15jP/sV2'),
  ('HRUI-0006', '4106', 'pin:v1:VkLEFLmCvTJOa0umOagW6ue4KeAYMiuEORzJDDxzuO8', '$2a$10$mqb.cFznqOLA2E3JJ1MaH.r71MBCznVnkVuV.5nvwo5zKwU7imNiS'),
  ('HRUI-0007', '4107', 'pin:v1:8BE_YRx6FQwaspgvqRYgMQIj4kDdHoCD2Wv8PrnJhnA', '$2a$10$T/p5/lT3CQVt07xPeX4D.eMAzE3afV1IgK0ycg6i7tDAdypA7y5ly'),
  ('HRUI-0008', '4108', 'pin:v1:LHuasakStMnB1NGqyHCKx-G92LaT4FcXtb8qLwwRYuE', '$2a$10$K6vg43ZPM2ngDuk0m9UzLu7WCNLldYy6ogIgDQI.GfTdaUTSJ6My.'),
  ('HRUI-0009', '4109', 'pin:v1:dQV_NIaDxjM4f52G5G6788ZcbPZf9fOBB6VLyii7gYU', '$2a$10$ioX3saRRNsz8EqGGRUTtUuvG.WQQ.Kd1n5LEH1tMmL258rm8QrzXC'),
  ('HRUI-0010', '4110', 'pin:v1:5BzAFizEp9iL3dZb8cHZexa_-yiNlnd74Vd4L7WNcjY', '$2a$10$C/LsJN.Sa9UuZneQ.6FAIOzC4bWC1ru3biJf.HPyE4ROT8g2OI1t.'),
  ('HRUI-0011', '4111', 'pin:v1:ea9wpIjlkpDzCv0t8dZjXEG8ubsJ9-8JVEDFw9XkvV4', '$2a$10$y9p2/Sdns9Q8FGRzwogB5eqcdaEwr5d95gQon.W70tGVUf1hFc6zq'),
  ('HRUI-0012', '4112', 'pin:v1:OLPNH1lUObjRkeHB3MoB_hsGN1MkJdc7A4jVXV8fqVE', '$2a$10$F.SOgsl5IqVJyKe3UB6VLeuq.R.GaTcI1X/bUDeUyhHrZOTOoa3km');

INSERT INTO hr_employee_access_profiles (
  company_id,
  employee_id,
  status,
  default_method,
  last_enrolled_at,
  metadata_json,
  created_by
)
SELECT
  @company_id,
  e.id,
  'active',
  'pin',
  CASE WHEN CAST(SUBSTRING(e.employee_number, 6) AS UNSIGNED) <= 12 THEN NOW() ELSE NULL END,
  JSON_OBJECT('supports_face_recognition', CAST(SUBSTRING(e.employee_number, 6) AS UNSIGNED) <= 18, 'seed', 'hr-ui-unscheduled'),
  @user_id
FROM hr_employees e
WHERE e.company_id = @company_id
  AND e.status = 'active'
  AND e.employee_number LIKE 'HRUI-%'
  AND CAST(SUBSTRING(e.employee_number, 6) AS UNSIGNED) <= 30;

INSERT INTO hr_employee_access_methods (
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
  @company_id,
  p.id,
  'pin',
  pins.credential_ref,
  pins.secret_hash,
  'active',
  10,
  JSON_OBJECT('seed', 'hr-ui-unscheduled')
FROM tmp_hrui_pins pins
JOIN hr_employees e
  ON e.company_id = @company_id
  AND e.employee_number = pins.employee_number
JOIN hr_employee_access_profiles p
  ON p.company_id = @company_id
  AND p.employee_id = e.id;

INSERT INTO hr_face_enrollments (
  company_id,
  employee_id,
  status,
  expires_at,
  enrolled_at,
  deleted_at,
  created_by
)
SELECT
  @company_id,
  e.id,
  CASE
    WHEN CAST(SUBSTRING(e.employee_number, 6) AS UNSIGNED) IN (1, 2, 3, 4, 5, 6) THEN 'active'
    WHEN CAST(SUBSTRING(e.employee_number, 6) AS UNSIGNED) IN (7, 8) THEN 'pending'
    ELSE 'failed'
  END,
  CASE
    WHEN CAST(SUBSTRING(e.employee_number, 6) AS UNSIGNED) IN (7, 8) THEN DATE_ADD(NOW(), INTERVAL 2 DAY)
    ELSE DATE_ADD(NOW(), INTERVAL 365 DAY)
  END,
  CASE
    WHEN CAST(SUBSTRING(e.employee_number, 6) AS UNSIGNED) IN (1, 2, 3, 4, 5, 6) THEN DATE_SUB(NOW(), INTERVAL CAST(SUBSTRING(e.employee_number, 6) AS UNSIGNED) DAY)
    ELSE NULL
  END,
  NULL,
  @user_id
FROM hr_employees e
WHERE e.company_id = @company_id
  AND e.employee_number LIKE 'HRUI-%'
  AND CAST(SUBSTRING(e.employee_number, 6) AS UNSIGNED) <= 10;

INSERT INTO hr_assets (
  company_id,
  asset_code,
  asset_type,
  name,
  model,
  serial_number,
  responsible_employee_id,
  unit_id,
  status,
  assigned_at,
  value_amount,
  notes,
  created_by_user_id,
  updated_by_user_id
)
SELECT
  @company_id,
  CONCAT('HRUI-ASSET-', LPAD(n.n, 3, '0')),
  ELT(1 + MOD(n.n - 1, 5), 'laptop', 'tablet', 'scanner', 'radio', 'uniform_kit'),
  ELT(1 + MOD(n.n - 1, 5), 'Seed Laptop', 'Seed Tablet', 'Seed Barcode Scanner', 'Seed Radio', 'Seed Uniform Kit'),
  CONCAT('Model ', 100 + n.n),
  CONCAT('SN-HRUI-', LPAD(n.n, 5, '0')),
  e.id,
  e.unit_id,
  CASE WHEN MOD(n.n, 6) = 0 THEN 'maintenance' ELSE 'assigned' END,
  DATE_SUB(NOW(), INTERVAL n.n DAY),
  250.00 + (n.n * 35.00),
  'Seeded asset for HR UI testing.',
  @user_id,
  @user_id
FROM tmp_hrui_numbers n
JOIN hr_employees e
  ON e.company_id = @company_id
  AND e.employee_number = CONCAT('HRUI-', LPAD(n.n, 4, '0'))
WHERE n.n <= 18;

INSERT INTO hr_employee_records (
  company_id,
  record_number,
  employee_id,
  employee_name_snapshot,
  employee_position_snapshot,
  employee_department_snapshot,
  employee_unit_id_snapshot,
  employee_unit_name_snapshot,
  employee_business_id_snapshot,
  employee_business_name_snapshot,
  record_type,
  severity,
  status,
  title,
  description,
  actions_taken,
  event_date,
  reported_by_user_id,
  reported_by_employee_id,
  reported_by_name_snapshot,
  created_by_user_id,
  updated_by_user_id
)
SELECT
  @company_id,
  CONCAT('HRUI-REC-', LPAD(n.n, 4, '0')),
  e.id,
  CONCAT(e.first_name, ' ', e.last_name),
  e.position,
  e.department,
  e.unit_id,
  u.name,
  e.business_id,
  b.name,
  ELT(1 + MOD(n.n - 1, 5), 'incident', 'warning', 'recognition', 'observation', 'training'),
  ELT(1 + MOD(n.n - 1, 3), 'low', 'medium', 'high'),
  ELT(1 + MOD(n.n - 1, 3), 'pending', 'reviewed', 'resolved'),
  CONCAT('Seed HR record ', LPAD(n.n, 2, '0')),
  'Seeded HR record for records UI testing.',
  CASE WHEN MOD(n.n, 2) = 0 THEN 'Manager reviewed the record and added follow-up notes.' ELSE NULL END,
  DATE_SUB(NOW(), INTERVAL n.n DAY),
  @user_id,
  NULL,
  'HR UI Seed Admin',
  @user_id,
  @user_id
FROM tmp_hrui_numbers n
JOIN hr_employees e
  ON e.company_id = @company_id
  AND e.employee_number = CONCAT('HRUI-', LPAD(n.n, 4, '0'))
LEFT JOIN units u ON u.id = e.unit_id
LEFT JOIN businesses b ON b.id = e.business_id
WHERE n.n <= 15;

INSERT INTO hr_announcements (
  company_id,
  title,
  announcement_type,
  content,
  audience_type,
  status,
  scheduled_for,
  published_at,
  created_by
)
VALUES
  (@company_id, 'HR UI Seed: New site assignment process', 'general', 'Use Assign work site to place free employees only.', 'all', 'published', NULL, NOW(), @user_id),
  (@company_id, 'HR UI Seed: Kiosk testing ready', 'general', 'Seed kiosks are available for UI testing.', 'all', 'draft', NULL, NULL, @user_id);

-- Hard guard for the requested test state: employees must start with zero assigned schedules.
DELETE FROM hr_employee_work_site_assignments WHERE company_id = @company_id;
DELETE FROM hr_employee_schedule_assignments WHERE company_id = @company_id;
DELETE FROM hr_attendance_events WHERE company_id = @company_id;
DELETE FROM hr_attendance_daily_records WHERE company_id = @company_id;

SELECT
  'HR UI unscheduled seed complete' AS result,
  (SELECT COUNT(*) FROM units WHERE company_id = @company_id) AS units_count,
  (SELECT COUNT(*) FROM businesses WHERE company_id = @company_id) AS businesses_count,
  (SELECT COUNT(*) FROM hr_employees WHERE company_id = @company_id) AS employees_count,
  (SELECT COUNT(*) FROM hr_attendance_locations WHERE company_id = @company_id) AS locations_count,
  (SELECT COUNT(*) FROM hr_schedule_templates WHERE company_id = @company_id) AS schedule_templates_count,
  (SELECT COUNT(*) FROM hr_employee_schedule_assignments WHERE company_id = @company_id) AS employee_schedule_assignments_count,
  (SELECT COUNT(*) FROM hr_employee_work_site_assignments WHERE company_id = @company_id) AS employee_work_site_assignments_count;
