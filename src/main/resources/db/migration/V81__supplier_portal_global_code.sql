SET @drop_supplier_portal_company_code_sql = (
  SELECT IF(
    COUNT(*) > 0,
    'ALTER TABLE pos_supplier_portal_access DROP INDEX uk_pos_supplier_portal_access_code',
    'SELECT 1'
  )
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'pos_supplier_portal_access'
    AND index_name = 'uk_pos_supplier_portal_access_code'
);
PREPARE drop_supplier_portal_company_code_stmt FROM @drop_supplier_portal_company_code_sql;
EXECUTE drop_supplier_portal_company_code_stmt;
DEALLOCATE PREPARE drop_supplier_portal_company_code_stmt;

SET @add_supplier_portal_global_code_sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE pos_supplier_portal_access ADD UNIQUE KEY uk_pos_supplier_portal_access_global_code (portal_code)',
    'SELECT 1'
  )
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'pos_supplier_portal_access'
    AND index_name = 'uk_pos_supplier_portal_access_global_code'
);
PREPARE add_supplier_portal_global_code_stmt FROM @add_supplier_portal_global_code_sql;
EXECUTE add_supplier_portal_global_code_stmt;
DEALLOCATE PREPARE add_supplier_portal_global_code_stmt;
