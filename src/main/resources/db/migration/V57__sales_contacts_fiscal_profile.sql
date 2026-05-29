SET @schema_name = DATABASE();

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = @schema_name AND table_name = 'sales_contacts' AND column_name = 'fiscal_country') = 0,
  'ALTER TABLE sales_contacts ADD COLUMN fiscal_country varchar(80) DEFAULT NULL AFTER status',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = @schema_name AND table_name = 'sales_contacts' AND column_name = 'fiscal_legal_name') = 0,
  'ALTER TABLE sales_contacts ADD COLUMN fiscal_legal_name varchar(220) DEFAULT NULL AFTER fiscal_country',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = @schema_name AND table_name = 'sales_contacts' AND column_name = 'fiscal_tax_id') = 0,
  'ALTER TABLE sales_contacts ADD COLUMN fiscal_tax_id varchar(120) DEFAULT NULL AFTER fiscal_legal_name',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = @schema_name AND table_name = 'sales_contacts' AND column_name = 'fiscal_registry_id') = 0,
  'ALTER TABLE sales_contacts ADD COLUMN fiscal_registry_id varchar(140) DEFAULT NULL AFTER fiscal_tax_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = @schema_name AND table_name = 'sales_contacts' AND column_name = 'fiscal_address_line1') = 0,
  'ALTER TABLE sales_contacts ADD COLUMN fiscal_address_line1 varchar(240) DEFAULT NULL AFTER fiscal_registry_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = @schema_name AND table_name = 'sales_contacts' AND column_name = 'fiscal_address_line2') = 0,
  'ALTER TABLE sales_contacts ADD COLUMN fiscal_address_line2 varchar(240) DEFAULT NULL AFTER fiscal_address_line1',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = @schema_name AND table_name = 'sales_contacts' AND column_name = 'fiscal_city') = 0,
  'ALTER TABLE sales_contacts ADD COLUMN fiscal_city varchar(120) DEFAULT NULL AFTER fiscal_address_line2',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = @schema_name AND table_name = 'sales_contacts' AND column_name = 'fiscal_state') = 0,
  'ALTER TABLE sales_contacts ADD COLUMN fiscal_state varchar(120) DEFAULT NULL AFTER fiscal_city',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = @schema_name AND table_name = 'sales_contacts' AND column_name = 'fiscal_postal_code') = 0,
  'ALTER TABLE sales_contacts ADD COLUMN fiscal_postal_code varchar(40) DEFAULT NULL AFTER fiscal_state',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = @schema_name AND table_name = 'sales_contacts' AND column_name = 'fiscal_email') = 0,
  'ALTER TABLE sales_contacts ADD COLUMN fiscal_email varchar(220) DEFAULT NULL AFTER fiscal_postal_code',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = @schema_name AND table_name = 'sales_contacts' AND column_name = 'fiscal_regime') = 0,
  'ALTER TABLE sales_contacts ADD COLUMN fiscal_regime varchar(180) DEFAULT NULL AFTER fiscal_email',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = @schema_name AND table_name = 'sales_contacts' AND column_name = 'fiscal_notes') = 0,
  'ALTER TABLE sales_contacts ADD COLUMN fiscal_notes text DEFAULT NULL AFTER fiscal_regime',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = @schema_name AND table_name = 'sales_contacts' AND column_name = 'fiscal_responsibilities_json') = 0,
  'ALTER TABLE sales_contacts ADD COLUMN fiscal_responsibilities_json json DEFAULT NULL AFTER fiscal_notes',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = @schema_name AND table_name = 'sales_contacts' AND column_name = 'fiscal_metadata_json') = 0,
  'ALTER TABLE sales_contacts ADD COLUMN fiscal_metadata_json json DEFAULT NULL AFTER fiscal_responsibilities_json',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.statistics
   WHERE table_schema = @schema_name AND table_name = 'sales_contacts'
     AND index_name = 'idx_sales_contacts_company_fiscal_country') = 0,
  'ALTER TABLE sales_contacts ADD INDEX idx_sales_contacts_company_fiscal_country (company_id, fiscal_country)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.statistics
   WHERE table_schema = @schema_name AND table_name = 'sales_contacts'
     AND index_name = 'idx_sales_contacts_company_fiscal_tax') = 0,
  'ALTER TABLE sales_contacts ADD INDEX idx_sales_contacts_company_fiscal_tax (company_id, fiscal_tax_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.statistics
   WHERE table_schema = @schema_name AND table_name = 'sales_contacts'
     AND index_name = 'idx_sales_contacts_company_fiscal_registry') = 0,
  'ALTER TABLE sales_contacts ADD INDEX idx_sales_contacts_company_fiscal_registry (company_id, fiscal_registry_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
