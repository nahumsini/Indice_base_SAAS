-- Minimal local-only bootstrap for the documented demo login.
-- Deliberately independent from optional HR, payroll, inventory, and POS data.

DELIMITER //
DROP PROCEDURE IF EXISTS assert_local_login_database//
CREATE PROCEDURE assert_local_login_database()
BEGIN
  IF DATABASE() <> 'indice_db' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Refusing to restore the demo login outside indice_db';
  END IF;
END//
CALL assert_local_login_database()//
DROP PROCEDURE assert_local_login_database//
DELIMITER ;

START TRANSACTION;

INSERT INTO companies (name)
SELECT 'Empresa Demo Spring'
WHERE NOT EXISTS (
  SELECT 1
  FROM companies
  WHERE LOWER(TRIM(name)) = 'empresa demo spring'
);

INSERT INTO users (email, password_hash, full_name)
VALUES (
  'demo@example.com',
  '$2y$12$r4v9ajhCqzMS9en6YqQCuOYnQy.y3GEMpSoaFVfW0i9YvN1ub/8xy',
  'Usuario Demo'
)
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  full_name = VALUES(full_name),
  updated_at = CURRENT_TIMESTAMP;

SET @local_demo_user_id = (
  SELECT id
  FROM users
  WHERE LOWER(TRIM(email)) = 'demo@example.com'
  LIMIT 1
);
SET @local_demo_company_id = (
  SELECT id
  FROM companies
  WHERE LOWER(TRIM(name)) = 'empresa demo spring'
  ORDER BY id
  LIMIT 1
);

UPDATE user_companies
SET role = 'superadmin',
    status = 'active',
    visibility = 'all'
WHERE user_id = @local_demo_user_id
  AND company_id = @local_demo_company_id;

INSERT INTO user_companies (
  user_id,
  company_id,
  role,
  status,
  visibility
)
SELECT
  @local_demo_user_id,
  @local_demo_company_id,
  'superadmin',
  'active',
  'all'
WHERE NOT EXISTS (
  SELECT 1
  FROM user_companies
  WHERE user_id = @local_demo_user_id
    AND company_id = @local_demo_company_id
);

COMMIT;

SELECT
  u.email,
  c.name AS company_name,
  uc.role,
  uc.status
FROM users u
JOIN user_companies uc ON uc.user_id = u.id
JOIN companies c ON c.id = uc.company_id
WHERE u.id = @local_demo_user_id
  AND c.id = @local_demo_company_id;
