ALTER TABLE pos_self_service_pretickets
  ADD COLUMN discount_amount DECIMAL(15,4) NOT NULL DEFAULT 0 AFTER subtotal_amount,
  ADD COLUMN discount_rule_id BIGINT NULL AFTER discount_amount,
  ADD CONSTRAINT fk_pos_self_service_pretickets_discount_rule
    FOREIGN KEY (discount_rule_id) REFERENCES pos_discount_rules(id) ON DELETE SET NULL;

ALTER TABLE pos_self_service_preticket_items
  ADD COLUMN discount_amount DECIMAL(15,4) NOT NULL DEFAULT 0 AFTER unit_price,
  ADD COLUMN discount_rule_id BIGINT NULL AFTER discount_amount,
  ADD CONSTRAINT fk_pos_self_service_items_discount_rule
    FOREIGN KEY (discount_rule_id) REFERENCES pos_discount_rules(id) ON DELETE SET NULL;

ALTER TABLE sales_public_catalog_requests
  ADD COLUMN subtotal_amount DECIMAL(15,4) NOT NULL DEFAULT 0 AFTER item_count,
  ADD COLUMN discount_amount DECIMAL(15,4) NOT NULL DEFAULT 0 AFTER subtotal_amount,
  ADD COLUMN discount_rule_id BIGINT NULL AFTER discount_amount,
  ADD CONSTRAINT fk_sales_public_catalog_requests_discount_rule
    FOREIGN KEY (discount_rule_id) REFERENCES pos_discount_rules(id) ON DELETE SET NULL;

UPDATE sales_public_catalog_requests
SET subtotal_amount = estimated_total
WHERE subtotal_amount = 0;

ALTER TABLE sales_public_catalog_request_items
  ADD COLUMN discount_amount DECIMAL(15,4) NOT NULL DEFAULT 0 AFTER unit_price,
  ADD COLUMN discount_rule_id BIGINT NULL AFTER discount_amount,
  ADD CONSTRAINT fk_sales_public_catalog_items_discount_rule
    FOREIGN KEY (discount_rule_id) REFERENCES pos_discount_rules(id) ON DELETE SET NULL;
