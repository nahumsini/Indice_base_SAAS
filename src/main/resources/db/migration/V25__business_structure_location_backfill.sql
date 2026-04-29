SET @add_business_latitude = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'businesses'
        AND column_name = 'latitude'
    ),
    'SELECT 1',
    'ALTER TABLE `businesses` ADD COLUMN `latitude` decimal(10,7) NULL AFTER `timezone`'
  )
);
PREPARE stmt FROM @add_business_latitude;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_business_longitude = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'businesses'
        AND column_name = 'longitude'
    ),
    'SELECT 1',
    'ALTER TABLE `businesses` ADD COLUMN `longitude` decimal(10,7) NULL AFTER `latitude`'
  )
);
PREPARE stmt FROM @add_business_longitude;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_business_radius = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'businesses'
        AND column_name = 'radius_meters'
    ),
    'SELECT 1',
    'ALTER TABLE `businesses` ADD COLUMN `radius_meters` int NULL AFTER `longitude`'
  )
);
PREPARE stmt FROM @add_business_radius;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_business_coordinate_source = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'businesses'
        AND column_name = 'coordinate_source'
    ),
    'SELECT 1',
    'ALTER TABLE `businesses` ADD COLUMN `coordinate_source` varchar(40) NULL AFTER `radius_meters`'
  )
);
PREPARE stmt FROM @add_business_coordinate_source;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_business_google_maps_url = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'businesses'
        AND column_name = 'google_maps_url'
    ),
    'SELECT 1',
    'ALTER TABLE `businesses` ADD COLUMN `google_maps_url` varchar(1024) NULL AFTER `coordinate_source`'
  )
);
PREPARE stmt FROM @add_business_google_maps_url;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_attendance_location_managed_source = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'hr_attendance_locations'
        AND column_name = 'managed_source'
    ),
    'SELECT 1',
    'ALTER TABLE `hr_attendance_locations` ADD COLUMN `managed_source` varchar(40) NULL AFTER `status`'
  )
);
PREPARE stmt FROM @add_attendance_location_managed_source;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE `hr_attendance_locations` l
JOIN `hr_kiosk_devices` k
  ON k.`company_id` = l.`company_id`
 AND k.`location_id` = l.`id`
SET l.`unit_id` = COALESCE(l.`unit_id`, k.`unit_id`),
    l.`business_id` = COALESCE(l.`business_id`, k.`business_id`),
    l.`managed_source` = 'business_structure'
WHERE l.`managed_source` IS NULL
  AND k.`business_id` IS NOT NULL;

UPDATE `businesses` b
JOIN `hr_attendance_locations` l
  ON l.`company_id` = b.`company_id`
 AND l.`business_id` = b.`id`
 AND l.`managed_source` = 'business_structure'
SET b.`latitude` = COALESCE(b.`latitude`, l.`latitude`),
    b.`longitude` = COALESCE(b.`longitude`, l.`longitude`),
    b.`radius_meters` = COALESCE(b.`radius_meters`, l.`radius_meters`),
    b.`coordinate_source` = COALESCE(b.`coordinate_source`, 'manual')
WHERE b.`latitude` IS NULL
   OR b.`longitude` IS NULL;
