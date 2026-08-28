CREATE TABLE IF NOT EXISTS `sales_opportunity_flows` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `company_id` BIGINT NOT NULL,
  `flow_key` VARCHAR(64) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `is_factory` TINYINT(1) NOT NULL DEFAULT 0,
  `is_default` TINYINT(1) NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_by_user_id` BIGINT DEFAULT NULL,
  `updated_by_user_id` BIGINT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sales_opportunity_flows_company_key` (`company_id`, `flow_key`),
  KEY `idx_sales_opportunity_flows_company_active` (`company_id`, `is_active`, `is_default`, `id`),
  CONSTRAINT `fk_sales_opportunity_flows_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sales_opportunity_flows_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_sales_opportunity_flows_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `sales_opportunity_flows`
  (`company_id`, `flow_key`, `name`, `is_factory`, `is_default`, `is_active`)
SELECT `id`, 'factory', 'Factory flow', 1, 1, 1
FROM `companies`
ON DUPLICATE KEY UPDATE `is_factory` = 1, `is_active` = 1;

INSERT INTO `sales_opportunity_flows`
  (`company_id`, `flow_key`, `name`, `is_factory`, `is_default`, `is_active`)
SELECT DISTINCT `company_id`, 'migrated_current', 'Current company flow', 0, 1, 1
FROM `sales_opportunity_flow_stages`
ON DUPLICATE KEY UPDATE `is_active` = 1;

UPDATE `sales_opportunity_flows` factory_flow
JOIN `sales_opportunity_flows` migrated_flow
  ON migrated_flow.company_id = factory_flow.company_id
 AND migrated_flow.flow_key = 'migrated_current'
SET factory_flow.is_default = 0
WHERE factory_flow.flow_key = 'factory';

ALTER TABLE `sales_opportunity_flow_stages`
  ADD COLUMN `flow_id` BIGINT DEFAULT NULL AFTER `company_id`;

UPDATE `sales_opportunity_flow_stages` stage
JOIN `sales_opportunity_flows` flow
  ON flow.company_id = stage.company_id
 AND flow.flow_key = 'migrated_current'
SET stage.flow_id = flow.id;

ALTER TABLE `sales_opportunity_flow_stages`
  DROP INDEX `uk_sales_opportunity_flow_company_key`,
  MODIFY COLUMN `flow_id` BIGINT NOT NULL,
  ADD UNIQUE KEY `uk_sales_opportunity_flow_stage_key` (`flow_id`, `stage_key`),
  ADD KEY `idx_sales_opportunity_flow_stage_company_flow` (`company_id`, `flow_id`, `is_active`, `sort_order`),
  ADD CONSTRAINT `fk_sales_opportunity_flow_stage_flow` FOREIGN KEY (`flow_id`) REFERENCES `sales_opportunity_flows` (`id`) ON DELETE CASCADE;

INSERT INTO `sales_opportunity_flow_stages`
  (`company_id`, `flow_id`, `stage_key`, `label`, `stage_type`, `color_token`,
   `default_probability_percent`, `sort_order`, `is_active`)
SELECT flow.company_id, flow.id, defaults.stage_key, defaults.label, defaults.stage_type,
       defaults.color_token, defaults.probability_percent, defaults.sort_order, 1
FROM `sales_opportunity_flows` flow
JOIN (
  SELECT 'new' AS stage_key, 'New' AS label, 'OPEN' AS stage_type, 'BLUE' AS color_token, 10 AS probability_percent, 0 AS sort_order
  UNION ALL SELECT 'contacted', 'Contacted', 'OPEN', 'AQUA', 25, 1
  UNION ALL SELECT 'qualified', 'Qualified', 'OPEN', 'GREEN', 50, 2
  UNION ALL SELECT 'proposal', 'Proposal', 'OPEN', 'YELLOW', 75, 3
  UNION ALL SELECT 'negotiation', 'Negotiation', 'OPEN', 'CORAL', 90, 4
  UNION ALL SELECT 'won', 'Won', 'WON', 'GREEN', 100, 5
  UNION ALL SELECT 'lost', 'Lost', 'LOST', 'CORAL', 0, 6
) defaults
WHERE flow.flow_key = 'factory'
ON DUPLICATE KEY UPDATE
  `label` = VALUES(`label`),
  `stage_type` = VALUES(`stage_type`),
  `color_token` = VALUES(`color_token`),
  `default_probability_percent` = VALUES(`default_probability_percent`),
  `sort_order` = VALUES(`sort_order`),
  `is_active` = 1;

ALTER TABLE `sales_opportunity_flow_revisions`
  ADD COLUMN `flow_id` BIGINT DEFAULT NULL AFTER `company_id`,
  ADD KEY `idx_sales_opportunity_flow_revision_flow_created` (`flow_id`, `created_at`, `id`),
  ADD CONSTRAINT `fk_sales_opportunity_flow_revision_flow` FOREIGN KEY (`flow_id`) REFERENCES `sales_opportunity_flows` (`id`) ON DELETE SET NULL;

UPDATE `sales_opportunity_flow_revisions` revision
JOIN `sales_opportunity_flows` flow
  ON flow.company_id = revision.company_id
 AND flow.is_default = 1
SET revision.flow_id = flow.id
WHERE revision.flow_id IS NULL;

ALTER TABLE `sales_opportunities`
  ADD COLUMN `lifecycle_status` VARCHAR(16) NOT NULL DEFAULT 'OPEN' AFTER `stage`,
  ADD KEY `idx_sales_opportunities_company_lifecycle` (`company_id`, `lifecycle_status`);

UPDATE `sales_opportunities`
SET `lifecycle_status` = CASE
  WHEN LOWER(TRIM(`stage`)) = 'won' THEN 'WON'
  WHEN LOWER(TRIM(`stage`)) = 'lost' THEN 'LOST'
  ELSE 'OPEN'
END;

CREATE TABLE IF NOT EXISTS `sales_opportunity_flow_positions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `company_id` BIGINT NOT NULL,
  `opportunity_id` BIGINT NOT NULL,
  `flow_id` BIGINT NOT NULL,
  `stage_id` BIGINT NOT NULL,
  `probability_percent` INT NOT NULL DEFAULT 0,
  `created_by_user_id` BIGINT DEFAULT NULL,
  `updated_by_user_id` BIGINT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sales_opportunity_position_opportunity_flow` (`opportunity_id`, `flow_id`),
  KEY `idx_sales_opportunity_position_company_flow_stage` (`company_id`, `flow_id`, `stage_id`),
  CONSTRAINT `fk_sales_opportunity_position_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sales_opportunity_position_opportunity` FOREIGN KEY (`opportunity_id`) REFERENCES `sales_opportunities` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sales_opportunity_position_flow` FOREIGN KEY (`flow_id`) REFERENCES `sales_opportunity_flows` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sales_opportunity_position_stage` FOREIGN KEY (`stage_id`) REFERENCES `sales_opportunity_flow_stages` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_sales_opportunity_position_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_sales_opportunity_position_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `sales_opportunity_flow_positions`
  (`company_id`, `opportunity_id`, `flow_id`, `stage_id`, `probability_percent`)
SELECT opportunity.company_id, opportunity.id, flow.id, stage.id, stage.default_probability_percent
FROM `sales_opportunities` opportunity
JOIN `sales_opportunity_flows` flow
  ON flow.company_id = opportunity.company_id
 AND flow.is_active = 1
JOIN `sales_opportunity_flow_stages` stage
  ON stage.flow_id = flow.id
 AND stage.is_active = 1
 AND stage.stage_key = (CASE
   WHEN opportunity.lifecycle_status = 'WON' THEN 'won'
   WHEN opportunity.lifecycle_status = 'LOST' THEN 'lost'
   WHEN EXISTS (
     SELECT 1
     FROM `sales_opportunity_flow_stages` matching_stage
     WHERE matching_stage.flow_id = flow.id
       AND matching_stage.is_active = 1
       AND matching_stage.stage_type = 'OPEN'
       AND matching_stage.stage_key = LOWER(TRIM(opportunity.stage)) COLLATE utf8mb4_unicode_ci
   ) THEN LOWER(TRIM(opportunity.stage))
   ELSE (
     SELECT first_stage.stage_key
     FROM `sales_opportunity_flow_stages` first_stage
     WHERE first_stage.flow_id = flow.id
       AND first_stage.is_active = 1
       AND first_stage.stage_type = 'OPEN'
     ORDER BY first_stage.sort_order, first_stage.id
     LIMIT 1
   )
 END) COLLATE utf8mb4_unicode_ci
WHERE opportunity.deleted_at IS NULL
ON DUPLICATE KEY UPDATE
  `stage_id` = VALUES(`stage_id`),
  `probability_percent` = VALUES(`probability_percent`);

CREATE TABLE IF NOT EXISTS `sales_opportunity_flow_position_history` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `company_id` BIGINT NOT NULL,
  `opportunity_id` BIGINT NOT NULL,
  `flow_id` BIGINT NOT NULL,
  `from_stage_id` BIGINT DEFAULT NULL,
  `to_stage_id` BIGINT NOT NULL,
  `reason_code` VARCHAR(40) NOT NULL,
  `created_by_user_id` BIGINT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sales_opportunity_flow_history_opportunity` (`company_id`, `opportunity_id`, `created_at`, `id`),
  KEY `idx_sales_opportunity_flow_history_flow` (`flow_id`, `created_at`, `id`),
  CONSTRAINT `fk_sales_opportunity_flow_history_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sales_opportunity_flow_history_opportunity` FOREIGN KEY (`opportunity_id`) REFERENCES `sales_opportunities` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sales_opportunity_flow_history_flow` FOREIGN KEY (`flow_id`) REFERENCES `sales_opportunity_flows` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sales_opportunity_flow_history_from_stage` FOREIGN KEY (`from_stage_id`) REFERENCES `sales_opportunity_flow_stages` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_sales_opportunity_flow_history_to_stage` FOREIGN KEY (`to_stage_id`) REFERENCES `sales_opportunity_flow_stages` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_sales_opportunity_flow_history_user` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
