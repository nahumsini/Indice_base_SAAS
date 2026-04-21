ALTER TABLE `hr_schedule_templates`
  ADD COLUMN `schedule_mode` varchar(20) NOT NULL DEFAULT 'strict' AFTER `status`,
  ADD COLUMN `block_after_grace_period` tinyint(1) NOT NULL DEFAULT '0' AFTER `schedule_mode`,
  ADD COLUMN `enforce_location` tinyint(1) NOT NULL DEFAULT '0' AFTER `block_after_grace_period`,
  ADD COLUMN `location_id` bigint DEFAULT NULL AFTER `enforce_location`,
  ADD KEY `idx_hr_schedule_templates_location` (`location_id`),
  ADD CONSTRAINT `fk_hr_schedule_templates_location`
    FOREIGN KEY (`location_id`) REFERENCES `hr_attendance_locations` (`id`) ON DELETE SET NULL;

ALTER TABLE `hr_schedule_template_days`
  ADD COLUMN `meal_minutes` int NOT NULL DEFAULT '0' AFTER `end_time`,
  ADD COLUMN `rest_minutes` int NOT NULL DEFAULT '0' AFTER `meal_minutes`;
