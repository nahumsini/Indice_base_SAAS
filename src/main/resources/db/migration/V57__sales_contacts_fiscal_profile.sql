ALTER TABLE `sales_contacts`
  ADD COLUMN `fiscal_country` varchar(80) DEFAULT NULL AFTER `status`,
  ADD COLUMN `fiscal_legal_name` varchar(220) DEFAULT NULL AFTER `fiscal_country`,
  ADD COLUMN `fiscal_tax_id` varchar(120) DEFAULT NULL AFTER `fiscal_legal_name`,
  ADD COLUMN `fiscal_registry_id` varchar(140) DEFAULT NULL AFTER `fiscal_tax_id`,
  ADD COLUMN `fiscal_address_line1` varchar(240) DEFAULT NULL AFTER `fiscal_registry_id`,
  ADD COLUMN `fiscal_address_line2` varchar(240) DEFAULT NULL AFTER `fiscal_address_line1`,
  ADD COLUMN `fiscal_city` varchar(120) DEFAULT NULL AFTER `fiscal_address_line2`,
  ADD COLUMN `fiscal_state` varchar(120) DEFAULT NULL AFTER `fiscal_city`,
  ADD COLUMN `fiscal_postal_code` varchar(40) DEFAULT NULL AFTER `fiscal_state`,
  ADD COLUMN `fiscal_email` varchar(220) DEFAULT NULL AFTER `fiscal_postal_code`,
  ADD COLUMN `fiscal_regime` varchar(180) DEFAULT NULL AFTER `fiscal_email`,
  ADD COLUMN `fiscal_notes` text DEFAULT NULL AFTER `fiscal_regime`,
  ADD COLUMN `fiscal_responsibilities_json` json DEFAULT NULL AFTER `fiscal_notes`,
  ADD COLUMN `fiscal_metadata_json` json DEFAULT NULL AFTER `fiscal_responsibilities_json`;

CREATE INDEX `idx_sales_contacts_company_fiscal_country`
  ON `sales_contacts` (`company_id`, `fiscal_country`);

CREATE INDEX `idx_sales_contacts_company_fiscal_tax`
  ON `sales_contacts` (`company_id`, `fiscal_tax_id`);

CREATE INDEX `idx_sales_contacts_company_fiscal_registry`
  ON `sales_contacts` (`company_id`, `fiscal_registry_id`);
