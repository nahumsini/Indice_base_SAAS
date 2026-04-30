ALTER TABLE `hr_attendance_locations`
  ADD COLUMN `contract_start_date` date NULL AFTER `business_id`,
  ADD COLUMN `contract_end_date` date NULL AFTER `contract_start_date`;

UPDATE `hr_attendance_locations`
SET `contract_start_date` = COALESCE(`contract_start_date`, CURRENT_DATE),
    `contract_end_date` = COALESCE(`contract_end_date`, COALESCE(`contract_start_date`, CURRENT_DATE));

ALTER TABLE `hr_attendance_locations`
  MODIFY COLUMN `contract_start_date` date NOT NULL,
  MODIFY COLUMN `contract_end_date` date NOT NULL;
