-- The warehouse is the canonical organizational assignment for POS operations.
-- Repair registers created before their warehouse received a unit/business assignment.
UPDATE pos_cash_registers cash_register
JOIN sales_inventory_warehouses warehouse
  ON warehouse.id = cash_register.warehouse_id
 AND warehouse.company_id = cash_register.company_id
JOIN units unit
  ON unit.id = CAST(warehouse.business_unit_id AS UNSIGNED)
 AND (unit.company_id = warehouse.company_id OR unit.company_id IS NULL)
JOIN businesses business
  ON business.id = CAST(warehouse.business_id AS UNSIGNED)
 AND business.unit_id = unit.id
 AND (business.company_id = warehouse.company_id OR business.company_id IS NULL)
SET cash_register.unit_id = unit.id,
    cash_register.business_id = business.id,
    cash_register.version = cash_register.version + 1
WHERE cash_register.deleted_at IS NULL
  AND warehouse.deleted_at IS NULL
  AND warehouse.business_unit_id REGEXP '^[0-9]+$'
  AND warehouse.business_id REGEXP '^[0-9]+$'
  AND (
    NOT (cash_register.unit_id <=> unit.id)
    OR NOT (cash_register.business_id <=> business.id)
  );
