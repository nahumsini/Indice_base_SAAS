CREATE OR REPLACE VIEW hr_users AS
SELECT uc.id AS id,
       uc.company_id AS company_id,
       uc.id AS user_company_id,
       u.id AS user_id,
       wp.id AS work_profile_id,
       COALESCE(wp.user_code, '') AS user_code,
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
