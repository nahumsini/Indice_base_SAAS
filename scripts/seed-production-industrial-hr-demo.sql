-- Industrial sales demo: fictional employees, fiscal weekly payroll profiles,
-- schedules, and simulated attendance for July 1 through August 15, 2026.
--
-- Local:
--   docker exec -i indice-mysql-fresh mysql -u indice_user -pindice_pass indice_db \
--     < scripts/seed-production-industrial-hr-demo.sql
--
-- Production requires an explicit session flag:
--   mysql --init-command="SET @allow_production_demo = 1" corazon_testers \
--     < scripts/seed-production-industrial-hr-demo.sql
--
-- All people, emails, phones, tax identifiers, and attendance records are
-- synthetic. The script is idempotent for the DEMO-MTY-HR-* data set.

SET @allow_production_demo := COALESCE(@allow_production_demo, 0);
SET @demo_company_name := 'Aceros y Aluminios Regiomontanos Demo';
SET @demo_admin_email := 'demo.aceros@indiceapp.com';
SET @demo_employee_password_hash := '$2y$12$fI9rCTB0OSsRQFrjg5RU1unXHhZcdHQ49iS2UmKNxEZ5z15I6Chf2';

DELIMITER //
DROP PROCEDURE IF EXISTS assert_industrial_hr_demo_target//
CREATE PROCEDURE assert_industrial_hr_demo_target()
BEGIN
  IF DATABASE() = 'corazon_testers' AND @allow_production_demo <> 1 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Production demo flag is required';
  ELSEIF DATABASE() NOT IN ('indice_db', 'corazon_testers') THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Unsupported database for industrial HR demo';
  END IF;

  IF (SELECT COUNT(*) FROM companies WHERE LOWER(name) = LOWER(@demo_company_name)) <> 1 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Industrial demo company must exist exactly once';
  END IF;

  IF (
    SELECT COUNT(*)
    FROM users user_row
    JOIN user_companies membership ON membership.user_id = user_row.id
    JOIN companies company ON company.id = membership.company_id
    WHERE LOWER(user_row.email) = LOWER(@demo_admin_email)
      AND LOWER(company.name) = LOWER(@demo_company_name)
      AND LOWER(membership.role) = 'superadmin'
      AND LOWER(membership.status) = 'active'
  ) <> 1 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Active industrial demo superadmin is required';
  END IF;
END//
CALL assert_industrial_hr_demo_target()//
DROP PROCEDURE assert_industrial_hr_demo_target//
DELIMITER ;

SELECT id INTO @demo_company_id
FROM companies
WHERE LOWER(name) = LOWER(@demo_company_name)
LIMIT 1;

SELECT user_row.id, membership.id
INTO @demo_admin_user_id, @demo_admin_user_company_id
FROM users user_row
JOIN user_companies membership
  ON membership.user_id = user_row.id
 AND membership.company_id = @demo_company_id
WHERE LOWER(user_row.email) = LOWER(@demo_admin_email)
LIMIT 1;

SELECT id INTO @demo_unit_id
FROM units
WHERE company_id = @demo_company_id
  AND name = 'Operación Monterrey'
ORDER BY id
LIMIT 1;

SELECT id INTO @demo_business_id
FROM businesses
WHERE company_id = @demo_company_id
  AND name = 'Centro Industrial Apodaca'
ORDER BY id
LIMIT 1;

START TRANSACTION;

DROP TEMPORARY TABLE IF EXISTS tmp_industrial_demo_employees;
CREATE TEMPORARY TABLE tmp_industrial_demo_employees (
  employee_no int PRIMARY KEY,
  user_code varchar(50) NOT NULL,
  email varchar(120) NOT NULL,
  full_name varchar(120) NOT NULL,
  phone varchar(50) NOT NULL,
  position_title varchar(100) NOT NULL,
  department varchar(100) NOT NULL,
  weekly_salary decimal(10,2) NOT NULL,
  hire_date date NOT NULL,
  date_of_birth date NOT NULL,
  city varchar(120) NOT NULL,
  access_group varchar(30) NOT NULL
);

INSERT INTO tmp_industrial_demo_employees VALUES
  (1,  'DEMO-MTY-HR-001', 'demo.mty.caja01@employees.example', 'Mariana López Rivera',      '+52-81-0000-1001', 'Cajera POS',               'Punto de venta',       3200.00, '2024-02-05', '1996-04-18', 'Apodaca',   'cashier'),
  (2,  'DEMO-MTY-HR-002', 'demo.mty.caja02@employees.example', 'Jorge Salinas Torres',     '+52-81-0000-1002', 'Cajero POS',               'Punto de venta',       3200.00, '2024-04-15', '1993-09-07', 'Apodaca',   'cashier'),
  (3,  'DEMO-MTY-HR-003', 'demo.mty.caja03@employees.example', 'Fernanda Ruiz García',     '+52-81-0000-1003', 'Cajera POS',               'Punto de venta',       3300.00, '2025-01-13', '1998-01-22', 'Guadalupe', 'cashier'),
  (4,  'DEMO-MTY-HR-004', 'demo.mty.caja04@employees.example', 'Diego Martínez Soto',      '+52-81-0000-1004', 'Cajero POS',               'Punto de venta',       3300.00, '2025-03-03', '1995-11-30', 'Monterrey', 'cashier'),
  (5,  'DEMO-MTY-HR-005', 'demo.mty.bodega01@employees.example','Luis Hernández Vega',      '+52-81-0000-1005', 'Auxiliar de bodega',       'Almacén y logística',  3500.00, '2023-08-07', '1990-06-14', 'Apodaca',   'warehouse'),
  (6,  'DEMO-MTY-HR-006', 'demo.mty.bodega02@employees.example','Carlos Mendoza Ríos',       '+52-81-0000-1006', 'Auxiliar de bodega',       'Almacén y logística',  3500.00, '2024-01-08', '1992-03-21', 'Escobedo',  'warehouse'),
  (7,  'DEMO-MTY-HR-007', 'demo.mty.bodega03@employees.example','Andrea Castillo Luna',      '+52-81-0000-1007', 'Control de inventarios',   'Almacén y logística',  3900.00, '2024-06-10', '1997-07-12', 'Guadalupe', 'warehouse'),
  (8,  'DEMO-MTY-HR-008', 'demo.mty.bodega04@employees.example','Miguel Ángel Flores',       '+52-81-0000-1008', 'Montacarguista',            'Almacén y logística',  3800.00, '2023-10-02', '1989-12-05', 'Apodaca',   'warehouse'),
  (9,  'DEMO-MTY-HR-009', 'demo.mty.bodega05@employees.example','Roberto Navarro Pérez',     '+52-81-0000-1009', 'Surtidor de pedidos',       'Almacén y logística',  3600.00, '2025-02-17', '1994-08-19', 'Escobedo',  'warehouse'),
  (10, 'DEMO-MTY-HR-010', 'demo.mty.bodega06@employees.example','Sofía Ramírez Cruz',        '+52-81-0000-1010', 'Recepción de materiales',  'Almacén y logística',  3700.00, '2024-09-09', '1999-02-11', 'Monterrey', 'warehouse'),
  (11, 'DEMO-MTY-HR-011', 'demo.mty.ventas01@employees.example','Valeria Gómez Silva',       '+52-81-0000-1011', 'Ejecutiva de ventas',      'Ventas',                4500.00, '2023-05-22', '1991-10-16', 'San Nicolás','sales'),
  (12, 'DEMO-MTY-HR-012', 'demo.mty.ventas02@employees.example','Ricardo Treviño Mora',      '+52-81-0000-1012', 'Ejecutivo de ventas',      'Ventas',                4500.00, '2024-07-01', '1988-05-09', 'Monterrey', 'sales'),
  (13, 'DEMO-MTY-HR-013', 'demo.mty.chofer01@employees.example','Óscar Campos León',          '+52-81-0000-1013', 'Chofer de reparto',        'Distribución',          4000.00, '2023-11-06', '1987-01-27', 'Apodaca',   'driver'),
  (14, 'DEMO-MTY-HR-014', 'demo.mty.chofer02@employees.example','Héctor Garza Molina',       '+52-81-0000-1014', 'Chofer de reparto',        'Distribución',          4000.00, '2024-03-18', '1990-09-23', 'Escobedo',  'driver'),
  (15, 'DEMO-MTY-HR-015', 'demo.mty.gerencia@employees.example','Gabriela Sánchez Ortiz',    '+52-81-0000-1015', 'Gerente de operaciones',   'Dirección',             8500.00, '2022-06-13', '1984-07-04', 'Monterrey', 'management'),
  (16, 'DEMO-MTY-HR-016', 'demo.mty.asistente@employees.example','Daniela Villarreal Reyes', '+52-81-0000-1016', 'Asistente de dirección',  'Dirección',             6000.00, '2023-09-04', '1993-03-15', 'San Nicolás','management'),
  (17, 'DEMO-MTY-HR-017', 'demo.mty.direccion@employees.example','Alejandro Cárdenas Fuentes','+52-81-0000-1017', 'Director general',         'Dirección',            15000.00, '2021-01-11', '1979-11-08', 'Monterrey', 'management');

-- The demo needs 18 active memberships including the tenant superadmin.
INSERT INTO company_seat_states
  (company_id, included_seats, purchased_extra_seats, reserved_seats)
VALUES (@demo_company_id, 20, 0, 0)
ON DUPLICATE KEY UPDATE
  included_seats = GREATEST(included_seats, 20),
  version = version + 1;

INSERT INTO users (email, password_hash, full_name)
SELECT employee.email, @demo_employee_password_hash, employee.full_name
FROM tmp_industrial_demo_employees employee
ON DUPLICATE KEY UPDATE
  full_name = VALUES(full_name),
  updated_at = CURRENT_TIMESTAMP;

DROP TEMPORARY TABLE IF EXISTS tmp_industrial_demo_employee_users;
CREATE TEMPORARY TABLE tmp_industrial_demo_employee_users AS
SELECT employee.*, user_row.id AS user_id
FROM tmp_industrial_demo_employees employee
JOIN users user_row ON LOWER(user_row.email) = LOWER(employee.email);

INSERT INTO user_profiles
  (user_id, full_name, phone, country, preferred_language)
SELECT user_id, full_name, phone, 'MX', 'es'
FROM tmp_industrial_demo_employee_users
ON DUPLICATE KEY UPDATE
  full_name = VALUES(full_name), phone = VALUES(phone),
  country = VALUES(country), preferred_language = VALUES(preferred_language);

INSERT INTO user_companies (user_id, company_id, role, status, visibility)
SELECT user_id, @demo_company_id, 'user', 'active', 'all'
FROM tmp_industrial_demo_employee_users
ON DUPLICATE KEY UPDATE
  role = 'user', status = 'active', visibility = 'all';

DROP TEMPORARY TABLE IF EXISTS tmp_industrial_demo_memberships;
CREATE TEMPORARY TABLE tmp_industrial_demo_memberships AS
SELECT employee.*, membership.id AS user_company_id
FROM tmp_industrial_demo_employee_users employee
JOIN user_companies membership
  ON membership.user_id = employee.user_id
 AND membership.company_id = @demo_company_id;

INSERT INTO user_work_profiles
  (company_id, user_company_id, user_id, user_code, position, department,
   unit_id, business_id, hire_date, salary, pay_period, salary_type, hourly_rate,
   contract_type, contract_start_date, date_of_birth, address, national_id,
   tax_id, social_security_number, registration_country, state_province, city,
   postal_code, alternate_phone, emergency_contact_name,
   emergency_contact_relationship, emergency_contact_phone, workday_hours,
   workdays_per_week, payroll_treatment, status, created_by)
SELECT
  @demo_company_id, employee.user_company_id, employee.user_id,
  employee.user_code, employee.position_title, employee.department,
  @demo_unit_id, @demo_business_id, employee.hire_date, employee.weekly_salary,
  'weekly', 'daily', ROUND(employee.weekly_salary / 40, 2), 'permanent',
  employee.hire_date, employee.date_of_birth,
  CONCAT('Domicilio ficticio DEMO ', LPAD(employee.employee_no, 3, '0'), ', Nuevo León'),
  CONCAT('DEMO-CURP-', LPAD(employee.employee_no, 3, '0')),
  CONCAT('DMO260101', LPAD(employee.employee_no, 3, '0')),
  CONCAT('DEMO-NSS-', LPAD(employee.employee_no, 3, '0')),
  'MX', 'Nuevo León', employee.city, '66600', employee.phone,
  CONCAT('Contacto demo ', LPAD(employee.employee_no, 3, '0')),
  'Familiar', CONCAT('+52-81-0099-', LPAD(employee.employee_no, 4, '0')),
  8.00, 5.00, 'fiscal_payroll', 'active', @demo_admin_user_id
FROM tmp_industrial_demo_memberships employee
ON DUPLICATE KEY UPDATE
  user_code = VALUES(user_code), position = VALUES(position),
  department = VALUES(department), unit_id = VALUES(unit_id),
  business_id = VALUES(business_id), hire_date = VALUES(hire_date),
  salary = VALUES(salary), pay_period = 'weekly', salary_type = 'daily',
  hourly_rate = VALUES(hourly_rate), contract_type = 'permanent',
  contract_start_date = VALUES(contract_start_date),
  date_of_birth = VALUES(date_of_birth), address = VALUES(address),
  national_id = VALUES(national_id), tax_id = VALUES(tax_id),
  social_security_number = VALUES(social_security_number),
  registration_country = 'MX', state_province = 'Nuevo León',
  city = VALUES(city), postal_code = VALUES(postal_code),
  alternate_phone = VALUES(alternate_phone),
  emergency_contact_name = VALUES(emergency_contact_name),
  emergency_contact_relationship = VALUES(emergency_contact_relationship),
  emergency_contact_phone = VALUES(emergency_contact_phone),
  workday_hours = 8.00, workdays_per_week = 5.00,
  payroll_treatment = 'fiscal_payroll', status = 'active';

INSERT INTO payroll_preferences
  (company_id, grouping_mode, default_daily_hours, pay_leave_days,
   isr_rate, imss_user_rate, infonavit_user_rate, imss_employer_rate,
   infonavit_employer_rate, sar_employer_rate)
VALUES
  (@demo_company_id, 'single', 8.00, 1, 0.10000, 0.04000, 0.03000,
   0.07000, 0.05000, 0.02000)
ON DUPLICATE KEY UPDATE
  grouping_mode = 'single', default_daily_hours = 8.00, pay_leave_days = 1;

INSERT INTO user_number_sequences (company_id, prefix, padding, next_number)
VALUES (@demo_company_id, 'IND', 3, 18)
ON DUPLICATE KEY UPDATE next_number = GREATEST(next_number, 18);

-- Department-oriented access makes the fictional team useful in the demo.
DROP TEMPORARY TABLE IF EXISTS tmp_industrial_demo_access;
CREATE TEMPORARY TABLE tmp_industrial_demo_access (
  access_group varchar(30) NOT NULL,
  module_slug varchar(50) NOT NULL,
  tab_key varchar(100) NOT NULL,
  PRIMARY KEY (access_group, module_slug, tab_key)
);
INSERT INTO tmp_industrial_demo_access VALUES
  ('all','human_resources','attendance'),
  ('cashier','pos','sale'),('cashier','pos','clientes'),
  ('warehouse','inventory','products'),('warehouse','inventory','inventory'),
  ('warehouse','inventory','purchase-orders'),
  ('sales','crm','leads'),('sales','crm','contacts'),('sales','crm','quotes'),
  ('sales','crm','sales'),('sales','receivables','accounts-receivable'),
  ('driver','inventory','inventory'),
  ('management','processes','projects'),('management','processes','kpis'),
  ('management','inventory','inventory'),('management','crm','sales'),
  ('management','pos','kpis'),('management','kpis','kpis');

INSERT INTO user_company_module_roles (user_company_id, module_slug, role, skill_level)
SELECT DISTINCT employee.user_company_id, access.module_slug, 'user', 50
FROM tmp_industrial_demo_memberships employee
JOIN tmp_industrial_demo_access access
  ON access.access_group IN ('all', employee.access_group)
JOIN modules module_row
  ON module_row.slug = access.module_slug AND module_row.is_active = 1
ON DUPLICATE KEY UPDATE role = VALUES(role), skill_level = VALUES(skill_level);

INSERT INTO user_company_tab_permissions
  (user_company_id, module_slug, tab_key, can_view)
SELECT employee.user_company_id, access.module_slug, access.tab_key, 1
FROM tmp_industrial_demo_memberships employee
JOIN tmp_industrial_demo_access access
  ON access.access_group IN ('all', employee.access_group)
ON DUPLICATE KEY UPDATE can_view = 1;

-- Attendance operating context.
INSERT INTO attendance_locations
  (company_id, unit_id, business_id, contract_start_date, contract_end_date,
   name, latitude, longitude, radius_meters, required_hours_per_day,
   required_start_time, required_end_time, required_days_per_week, status,
   managed_source, created_by)
SELECT @demo_company_id, @demo_unit_id, @demo_business_id,
       '2026-01-01', '2027-12-31', 'Centro Industrial Apodaca - Acceso personal',
       25.7814000, -100.1877000, 150, 8.00, '08:00:00', '17:00:00', 5,
       'active', 'industrial_demo', @demo_admin_user_id
WHERE NOT EXISTS (
  SELECT 1 FROM attendance_locations
  WHERE company_id = @demo_company_id
    AND name = 'Centro Industrial Apodaca - Acceso personal'
);

SELECT id INTO @demo_attendance_location_id
FROM attendance_locations
WHERE company_id = @demo_company_id
  AND name = 'Centro Industrial Apodaca - Acceso personal'
ORDER BY id LIMIT 1;

INSERT INTO attendance_kiosk_devices
  (company_id, unit_id, business_id, location_id, code, name, status,
   public_access_token, metadata_json, created_by)
VALUES
  (@demo_company_id, @demo_unit_id, @demo_business_id,
   @demo_attendance_location_id, 'DEMO-MTY-HR-KIOSK-01',
   'Reloj checador industrial demo', 'active',
   SHA2(CONCAT('DEMO-MTY-HR-KIOSK-01-', @demo_company_id), 256),
   JSON_OBJECT('seed', 'industrial-hr-demo-v1', 'fictional', TRUE),
   @demo_admin_user_id)
ON DUPLICATE KEY UPDATE
  location_id = VALUES(location_id), name = VALUES(name), status = 'active',
  metadata_json = VALUES(metadata_json);

SELECT id INTO @demo_attendance_kiosk_id
FROM attendance_kiosk_devices
WHERE company_id = @demo_company_id AND code = 'DEMO-MTY-HR-KIOSK-01'
LIMIT 1;

INSERT INTO attendance_schedule_templates
  (company_id, name, status, schedule_mode, block_after_grace_period,
   enforce_location, location_id, created_by)
SELECT @demo_company_id, 'Jornada industrial lunes a viernes', 'active',
       'strict', 0, 1, @demo_attendance_location_id, @demo_admin_user_id
WHERE NOT EXISTS (
  SELECT 1 FROM attendance_schedule_templates
  WHERE company_id = @demo_company_id
    AND name = 'Jornada industrial lunes a viernes'
);

SELECT id INTO @demo_schedule_template_id
FROM attendance_schedule_templates
WHERE company_id = @demo_company_id
  AND name = 'Jornada industrial lunes a viernes'
ORDER BY id LIMIT 1;

DROP TEMPORARY TABLE IF EXISTS tmp_industrial_demo_weekdays;
CREATE TEMPORARY TABLE tmp_industrial_demo_weekdays (day_of_week tinyint PRIMARY KEY);
INSERT INTO tmp_industrial_demo_weekdays VALUES (1),(2),(3),(4),(5);

INSERT INTO attendance_schedule_template_days
  (template_id, day_of_week, start_time, end_time, meal_minutes, rest_minutes,
   late_after_minutes, is_rest_day)
SELECT @demo_schedule_template_id, day_of_week, '08:00:00', '17:00:00',
       60, 15, 7, 0
FROM tmp_industrial_demo_weekdays
ON DUPLICATE KEY UPDATE
  start_time = VALUES(start_time), end_time = VALUES(end_time),
  meal_minutes = VALUES(meal_minutes), rest_minutes = VALUES(rest_minutes),
  late_after_minutes = VALUES(late_after_minutes), is_rest_day = 0;

INSERT INTO user_schedule_assignments
  (company_id, user_company_id, user_id, template_id, effective_start_date,
   status, created_by)
SELECT @demo_company_id, employee.user_company_id, employee.user_id,
       @demo_schedule_template_id, '2026-01-01', 'active', @demo_admin_user_id
FROM tmp_industrial_demo_memberships employee
WHERE NOT EXISTS (
  SELECT 1 FROM user_schedule_assignments assignment
  WHERE assignment.company_id = @demo_company_id
    AND assignment.user_company_id = employee.user_company_id
    AND assignment.template_id = @demo_schedule_template_id
    AND assignment.effective_start_date = '2026-01-01'
    AND assignment.status = 'active'
);

INSERT INTO user_work_site_assignments
  (company_id, user_company_id, user_id, location_id, effective_start_date,
   status, created_by)
SELECT @demo_company_id, employee.user_company_id, employee.user_id,
       @demo_attendance_location_id, '2026-01-01', 'active', @demo_admin_user_id
FROM tmp_industrial_demo_memberships employee
WHERE NOT EXISTS (
  SELECT 1 FROM user_work_site_assignments assignment
  WHERE assignment.company_id = @demo_company_id
    AND assignment.user_company_id = employee.user_company_id
    AND assignment.location_id = @demo_attendance_location_id
    AND assignment.effective_start_date = '2026-01-01'
    AND assignment.status = 'active'
);

INSERT INTO user_allowed_locations
  (company_id, user_company_id, user_id, location_id, status, created_by)
SELECT @demo_company_id, employee.user_company_id, employee.user_id,
       @demo_attendance_location_id, 'active', @demo_admin_user_id
FROM tmp_industrial_demo_memberships employee
ON DUPLICATE KEY UPDATE status = 'active';

-- Weekdays from July 1 through the current demo date, August 15, 2026.
DROP TEMPORARY TABLE IF EXISTS tmp_industrial_demo_attendance_dates;
CREATE TEMPORARY TABLE tmp_industrial_demo_attendance_dates (
  attendance_date date PRIMARY KEY,
  day_index int NOT NULL
);
INSERT INTO tmp_industrial_demo_attendance_dates (attendance_date, day_index)
WITH RECURSIVE dates AS (
  SELECT DATE('2026-07-01') AS attendance_date
  UNION ALL
  SELECT DATE_ADD(attendance_date, INTERVAL 1 DAY)
  FROM dates
  WHERE attendance_date < DATE('2026-08-15')
)
SELECT attendance_date, DATEDIFF(attendance_date, '2026-07-01')
FROM dates
WHERE DAYOFWEEK(attendance_date) BETWEEN 2 AND 6;

INSERT INTO user_attendance_daily_records
  (company_id, user_company_id, user_id, attendance_date, system_status,
   corrected_status, corrected_by, corrected_at, first_check_in_at,
   last_check_out_at, first_location_id, last_location_id, minutes_late,
   source_schedule_template_id, notes)
SELECT
  @demo_company_id, employee.user_company_id, employee.user_id,
  attendance.attendance_date,
  CASE
    WHEN MOD(employee.employee_no * 7 + attendance.day_index, 29) = 0 THEN 'absence'
    WHEN MOD(employee.employee_no * 5 + attendance.day_index, 13) = 0 THEN 'late'
    ELSE 'on_time'
  END,
  NULL, NULL, NULL,
  CASE
    WHEN MOD(employee.employee_no * 7 + attendance.day_index, 29) = 0 THEN NULL
    WHEN MOD(employee.employee_no * 5 + attendance.day_index, 13) = 0
      THEN DATE_ADD(TIMESTAMP(attendance.attendance_date, '08:00:00'),
                    INTERVAL (8 + MOD(employee.employee_no + attendance.day_index, 16)) MINUTE)
    ELSE DATE_ADD(TIMESTAMP(attendance.attendance_date, '08:00:00'),
                  INTERVAL (-8 + MOD(employee.employee_no + attendance.day_index, 9)) MINUTE)
  END,
  CASE
    WHEN MOD(employee.employee_no * 7 + attendance.day_index, 29) = 0 THEN NULL
    ELSE DATE_ADD(TIMESTAMP(attendance.attendance_date, '17:00:00'),
                  INTERVAL MOD(employee.employee_no * 3 + attendance.day_index, 16) MINUTE)
  END,
  CASE WHEN MOD(employee.employee_no * 7 + attendance.day_index, 29) = 0
       THEN NULL ELSE @demo_attendance_location_id END,
  CASE WHEN MOD(employee.employee_no * 7 + attendance.day_index, 29) = 0
       THEN NULL ELSE @demo_attendance_location_id END,
  CASE WHEN MOD(employee.employee_no * 5 + attendance.day_index, 13) = 0
            AND MOD(employee.employee_no * 7 + attendance.day_index, 29) <> 0
       THEN 8 + MOD(employee.employee_no + attendance.day_index, 16)
       ELSE 0 END,
  @demo_schedule_template_id,
  'Asistencia ficticia para demo industrial julio-agosto 2026.'
FROM tmp_industrial_demo_memberships employee
CROSS JOIN tmp_industrial_demo_attendance_dates attendance
WHERE 1 = 1
ON DUPLICATE KEY UPDATE
  system_status = VALUES(system_status), corrected_status = NULL,
  corrected_by = NULL, corrected_at = NULL,
  first_check_in_at = VALUES(first_check_in_at),
  last_check_out_at = VALUES(last_check_out_at),
  first_location_id = VALUES(first_location_id),
  last_location_id = VALUES(last_location_id),
  minutes_late = VALUES(minutes_late),
  source_schedule_template_id = VALUES(source_schedule_template_id),
  notes = VALUES(notes);

INSERT INTO user_attendance_events
  (company_id, user_company_id, user_id, event_type, event_timestamp,
   attendance_date, location_id, kiosk_device_id, latitude, longitude, source,
   auth_method, result_status, event_kind, notes, metadata_json, created_by)
SELECT
  @demo_company_id, employee.user_company_id, employee.user_id,
  event_kind.event_type,
  CASE
    WHEN event_kind.event_type = 'check_in'
      AND MOD(employee.employee_no * 5 + attendance.day_index, 13) = 0
      THEN DATE_ADD(TIMESTAMP(attendance.attendance_date, '08:00:00'),
                    INTERVAL (8 + MOD(employee.employee_no + attendance.day_index, 16)) MINUTE)
    WHEN event_kind.event_type = 'check_in'
      THEN DATE_ADD(TIMESTAMP(attendance.attendance_date, '08:00:00'),
                    INTERVAL (-8 + MOD(employee.employee_no + attendance.day_index, 9)) MINUTE)
    ELSE DATE_ADD(TIMESTAMP(attendance.attendance_date, '17:00:00'),
                  INTERVAL MOD(employee.employee_no * 3 + attendance.day_index, 16) MINUTE)
  END,
  attendance.attendance_date, @demo_attendance_location_id,
  @demo_attendance_kiosk_id, 25.7814000, -100.1877000, 'kiosk', 'pin',
  'accepted', 'regular', 'Marcaje ficticio para demo industrial.',
  JSON_OBJECT('seed', 'industrial-hr-demo-v1', 'fictional', TRUE),
  @demo_admin_user_id
FROM tmp_industrial_demo_memberships employee
CROSS JOIN tmp_industrial_demo_attendance_dates attendance
CROSS JOIN (
  SELECT 'check_in' AS event_type
  UNION ALL SELECT 'check_out'
) event_kind
WHERE MOD(employee.employee_no * 7 + attendance.day_index, 29) <> 0
  AND NOT EXISTS (
    SELECT 1 FROM user_attendance_events existing
    WHERE existing.company_id = @demo_company_id
      AND existing.user_company_id = employee.user_company_id
      AND existing.attendance_date = attendance.attendance_date
      AND existing.event_type = event_kind.event_type
      AND existing.notes = 'Marcaje ficticio para demo industrial.'
  );

COMMIT;

SELECT
  @demo_company_id AS company_id,
  (SELECT COUNT(*) FROM user_work_profiles
   WHERE company_id = @demo_company_id AND user_code LIKE 'DEMO-MTY-HR-%'
     AND status = 'active') AS employees,
  (SELECT COUNT(*) FROM user_work_profiles
   WHERE company_id = @demo_company_id AND user_code LIKE 'DEMO-MTY-HR-%'
     AND pay_period = 'weekly' AND payroll_treatment = 'fiscal_payroll') AS fiscal_weekly_employees,
  (SELECT COUNT(*) FROM user_attendance_daily_records record
   JOIN user_work_profiles profile ON profile.user_company_id = record.user_company_id
   WHERE record.company_id = @demo_company_id
     AND profile.user_code LIKE 'DEMO-MTY-HR-%'
     AND record.attendance_date BETWEEN '2026-07-01' AND '2026-08-15') AS attendance_days,
  (SELECT COUNT(*) FROM user_attendance_events event
   JOIN user_work_profiles profile ON profile.user_company_id = event.user_company_id
   WHERE event.company_id = @demo_company_id
     AND profile.user_code LIKE 'DEMO-MTY-HR-%'
     AND event.notes = 'Marcaje ficticio para demo industrial.') AS attendance_events;
