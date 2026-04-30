SET @add_employee_profile_city = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'hr_employee_profiles'
        AND column_name = 'city'
    ),
    'SELECT 1',
    'ALTER TABLE `hr_employee_profiles` ADD COLUMN `city` varchar(120) NULL AFTER `state_province`'
  )
);
PREPARE stmt FROM @add_employee_profile_city;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_employee_profile_postal_code = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'hr_employee_profiles'
        AND column_name = 'postal_code'
    ),
    'SELECT 1',
    'ALTER TABLE `hr_employee_profiles` ADD COLUMN `postal_code` varchar(20) NULL AFTER `city`'
  )
);
PREPARE stmt FROM @add_employee_profile_postal_code;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
