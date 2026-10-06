-- Forward-only integration after the released platform lead V288/V289 lineage.
ALTER TABLE `sales_opportunity_flows`
  ADD UNIQUE KEY `uk_sales_opportunity_flows_company_id` (`company_id`, `id`);

ALTER TABLE `sales_opportunities`
  ADD COLUMN `assigned_flow_id` BIGINT DEFAULT NULL AFTER `lifecycle_status`;

UPDATE `sales_opportunities` opportunity
JOIN (
  SELECT flow.company_id,
         COALESCE(
           MIN(CASE WHEN flow.is_default = 1 THEN flow.id END),
           MIN(flow.id)
         ) AS flow_id
  FROM `sales_opportunity_flows` flow
  WHERE flow.is_active = 1
  GROUP BY flow.company_id
) selected_flow
  ON selected_flow.company_id = opportunity.company_id
-- This is a schema backfill, not a commercial edit. Preserve the original
-- timestamp explicitly against MySQL's ON UPDATE CURRENT_TIMESTAMP behavior.
SET opportunity.assigned_flow_id = selected_flow.flow_id,
    opportunity.updated_at = opportunity.updated_at
WHERE opportunity.assigned_flow_id IS NULL;

INSERT INTO `sales_opportunity_flow_positions`
  (`company_id`, `opportunity_id`, `flow_id`, `stage_id`, `probability_percent`)
SELECT opportunity.company_id,
       opportunity.id,
       flow.id,
       stage.id,
       stage.default_probability_percent
FROM `sales_opportunities` opportunity
JOIN `sales_opportunity_flows` flow
  ON flow.company_id = opportunity.company_id
 AND flow.id = opportunity.assigned_flow_id
 AND flow.is_active = 1
JOIN `sales_opportunity_flow_stages` stage
  ON stage.company_id = opportunity.company_id
 AND stage.flow_id = flow.id
 AND stage.is_active = 1
 AND stage.stage_key = CASE
   WHEN opportunity.lifecycle_status = 'WON' THEN 'won'
   WHEN opportunity.lifecycle_status = 'LOST' THEN 'lost'
   ELSE (
     SELECT first_stage.stage_key
     FROM `sales_opportunity_flow_stages` first_stage
     WHERE first_stage.company_id = opportunity.company_id
       AND first_stage.flow_id = flow.id
       AND first_stage.is_active = 1
       AND first_stage.stage_type = 'OPEN'
     ORDER BY first_stage.sort_order, first_stage.id
     LIMIT 1
   )
 END
WHERE opportunity.deleted_at IS NULL
ON DUPLICATE KEY UPDATE `opportunity_id` = VALUES(`opportunity_id`);

ALTER TABLE `sales_opportunities`
  MODIFY COLUMN `assigned_flow_id` BIGINT NOT NULL,
  ADD KEY `idx_sales_opportunities_company_flow_lifecycle`
    (`company_id`, `assigned_flow_id`, `lifecycle_status`),
  ADD CONSTRAINT `fk_sales_opportunities_assigned_flow`
    FOREIGN KEY (`company_id`, `assigned_flow_id`)
    REFERENCES `sales_opportunity_flows` (`company_id`, `id`)
    ON DELETE RESTRICT;

ALTER TABLE `sales_opportunity_flow_position_history`
  ADD COLUMN `from_flow_id` BIGINT DEFAULT NULL AFTER `opportunity_id`,
  ADD KEY `idx_sales_opportunity_flow_history_from_flow` (`from_flow_id`, `created_at`, `id`),
  ADD CONSTRAINT `fk_sales_opportunity_flow_history_from_flow`
    FOREIGN KEY (`from_flow_id`) REFERENCES `sales_opportunity_flows` (`id`) ON DELETE SET NULL;
