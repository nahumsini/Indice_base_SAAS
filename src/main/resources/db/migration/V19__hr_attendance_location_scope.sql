ALTER TABLE `hr_attendance_locations`
  ADD COLUMN `unit_id` bigint DEFAULT NULL AFTER `company_id`,
  ADD COLUMN `business_id` bigint DEFAULT NULL AFTER `unit_id`,
  ADD KEY `idx_hr_attendance_locations_unit` (`unit_id`),
  ADD KEY `idx_hr_attendance_locations_business` (`business_id`),
  ADD CONSTRAINT `fk_hr_attendance_locations_unit`
    FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_hr_attendance_locations_business`
    FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE SET NULL;
