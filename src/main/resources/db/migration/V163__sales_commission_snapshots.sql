ALTER TABLE `sales_records`
  ADD COLUMN `commission_rule_id` bigint DEFAULT NULL AFTER `commission_notes`,
  ADD COLUMN `commission_rule_code` varchar(40) DEFAULT NULL AFTER `commission_rule_id`,
  ADD COLUMN `commission_rule_name` varchar(180) DEFAULT NULL AFTER `commission_rule_code`,
  ADD COLUMN `commission_type` varchar(40) DEFAULT NULL AFTER `commission_rule_name`,
  ADD COLUMN `commission_value` decimal(15,4) NOT NULL DEFAULT 0.0000 AFTER `commission_type`,
  ADD COLUMN `commission_breakdown_json` json DEFAULT NULL AFTER `commission_value`,
  ADD KEY `idx_sales_records_commission_rule` (`company_id`, `commission_rule_id`),
  ADD CONSTRAINT `fk_sales_records_commission_rule`
    FOREIGN KEY (`commission_rule_id`) REFERENCES `sales_commission_rules` (`id`) ON DELETE SET NULL;
