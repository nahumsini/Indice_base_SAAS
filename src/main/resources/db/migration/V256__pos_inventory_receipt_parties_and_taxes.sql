ALTER TABLE pos_inventory_receipts
  ADD COLUMN provider_id bigint DEFAULT NULL AFTER shift_id,
  ADD COLUMN request_fingerprint char(64) DEFAULT NULL AFTER idempotency_key,
  ADD COLUMN subtotal_amount decimal(15,2) NOT NULL DEFAULT 0 AFTER payment_account_id,
  ADD COLUMN tax_amount decimal(15,2) NOT NULL DEFAULT 0 AFTER subtotal_amount,
  ADD KEY idx_pos_inventory_receipts_company_provider (company_id, provider_id, created_at),
  ADD CONSTRAINT fk_pos_inventory_receipts_provider
    FOREIGN KEY (provider_id) REFERENCES finance_providers(id);

UPDATE pos_inventory_receipts
SET subtotal_amount = total_amount
WHERE subtotal_amount = 0 AND total_amount <> 0;

ALTER TABLE pos_inventory_receipt_items
  ADD COLUMN entered_unit_cost decimal(15,4) NOT NULL DEFAULT 0 AFTER quantity,
  ADD COLUMN inventory_unit_cost decimal(15,4) NOT NULL DEFAULT 0 AFTER unit_cost,
  ADD COLUMN tax_rate decimal(9,6) NOT NULL DEFAULT 0 AFTER inventory_unit_cost,
  ADD COLUMN tax_included tinyint(1) NOT NULL DEFAULT 0 AFTER tax_rate,
  ADD COLUMN tax_profile_id varchar(80) DEFAULT NULL AFTER tax_included,
  ADD COLUMN tax_name varchar(120) DEFAULT NULL AFTER tax_profile_id,
  ADD COLUMN subtotal_amount decimal(15,2) NOT NULL DEFAULT 0 AFTER tax_name,
  ADD COLUMN tax_amount decimal(15,2) NOT NULL DEFAULT 0 AFTER subtotal_amount;

UPDATE pos_inventory_receipt_items
SET entered_unit_cost = unit_cost,
    inventory_unit_cost = unit_cost,
    subtotal_amount = line_total
WHERE entered_unit_cost = 0 AND unit_cost <> 0;
