ALTER TABLE `hr_kiosk_devices`
  ADD COLUMN `public_access_token` varchar(64) DEFAULT NULL AFTER `status`;

UPDATE `hr_kiosk_devices`
SET `public_access_token` = REPLACE(UUID(), '-', '')
WHERE COALESCE(TRIM(`public_access_token`), '') = '';

ALTER TABLE `hr_kiosk_devices`
  MODIFY COLUMN `public_access_token` varchar(64) NOT NULL,
  ADD UNIQUE KEY `uq_hr_kiosk_devices_public_access_token` (`public_access_token`);
