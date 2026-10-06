-- Preserve the three decimal inventory units and four decimal costs already accepted by POS receipts.
-- Forward-only widening: existing integer and two decimal values retain their exact value.
ALTER TABLE sales_inventory_balances
  MODIFY available_quantity DECIMAL(16,3) NOT NULL DEFAULT 0.000,
  MODIFY reserved_quantity DECIMAL(16,3) NOT NULL DEFAULT 0.000,
  MODIFY minimum_quantity DECIMAL(16,3) NOT NULL DEFAULT 0.000,
  MODIFY unit_cost DECIMAL(17,4) NOT NULL DEFAULT 0.0000;
ALTER TABLE sales_inventory_movements
  MODIFY quantity DECIMAL(16,3) NOT NULL DEFAULT 0.000,
  MODIFY unit_cost DECIMAL(17,4) NULL;
