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
