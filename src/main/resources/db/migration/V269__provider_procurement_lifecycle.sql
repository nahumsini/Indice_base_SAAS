ALTER TABLE pos_supplier_invoices
  ADD COLUMN expense_id BIGINT NULL AFTER purchase_order_id,
  ADD UNIQUE KEY uk_pos_supplier_invoices_expense (company_id, expense_id),
  ADD CONSTRAINT fk_pos_supplier_invoices_expense
    FOREIGN KEY (expense_id) REFERENCES finance_expenses(id) ON DELETE RESTRICT;

-- Procurement and inventory carry authoritative unit costs at four decimals. Preserve that
-- precision when the reviewed supplier cost becomes the product catalog cost.
ALTER TABLE sales_products
  MODIFY COLUMN price DECIMAL(19,4) NULL,
  MODIFY COLUMN cost DECIMAL(19,4) NULL;

CREATE TABLE pos_supplier_catalog_decisions (
  id BIGINT NOT NULL AUTO_INCREMENT,
  company_id BIGINT NOT NULL,
  submission_id BIGINT NOT NULL,
  submission_item_id BIGINT NOT NULL,
  provider_id BIGINT NOT NULL,
  decision VARCHAR(32) NOT NULL,
  original_product_id BIGINT NULL,
  resolved_product_id BIGINT NULL,
  supplier_unit_cost DECIMAL(19,4) NOT NULL,
  previous_catalog_cost DECIMAL(19,4) NULL,
  previous_sale_price DECIMAL(19,4) NULL,
  approved_sale_price DECIMAL(19,4) NULL,
  currency_code VARCHAR(3) NOT NULL,
  review_note TEXT NULL,
  reviewed_by_user_id BIGINT NOT NULL,
  reviewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata_json JSON NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_supplier_catalog_decision_item (company_id, submission_item_id),
  KEY idx_supplier_catalog_decision_submission (company_id, submission_id),
  KEY idx_supplier_catalog_decision_product (company_id, resolved_product_id),
  CONSTRAINT fk_supplier_catalog_decision_company
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_supplier_catalog_decision_submission
    FOREIGN KEY (submission_id) REFERENCES pos_supplier_submissions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_supplier_catalog_decision_item
    FOREIGN KEY (submission_item_id) REFERENCES pos_supplier_submission_items(id) ON DELETE RESTRICT,
  CONSTRAINT fk_supplier_catalog_decision_provider
    FOREIGN KEY (provider_id) REFERENCES finance_providers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_supplier_catalog_decision_original_product
    FOREIGN KEY (original_product_id) REFERENCES sales_products(id) ON DELETE SET NULL,
  CONSTRAINT fk_supplier_catalog_decision_resolved_product
    FOREIGN KEY (resolved_product_id) REFERENCES sales_products(id) ON DELETE RESTRICT,
  CONSTRAINT fk_supplier_catalog_decision_reviewer
    FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT chk_supplier_catalog_decision_type
    CHECK (decision IN ('LINK_EXISTING', 'CREATE_NEW', 'REJECT')),
  CONSTRAINT chk_supplier_catalog_decision_amounts
    CHECK (
      supplier_unit_cost >= 0
      AND (approved_sale_price IS NULL OR approved_sale_price >= supplier_unit_cost)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
