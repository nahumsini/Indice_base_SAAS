SET @add_po_origin_sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE pos_purchase_orders ADD COLUMN origin VARCHAR(40) NOT NULL DEFAULT ''POS_REPLENISHMENT'' AFTER status',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'pos_purchase_orders'
    AND column_name = 'origin'
);
PREPARE add_po_origin_stmt FROM @add_po_origin_sql;
EXECUTE add_po_origin_stmt;
DEALLOCATE PREPARE add_po_origin_stmt;

SET @add_po_source_submission_sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE pos_purchase_orders ADD COLUMN source_submission_id BIGINT NULL AFTER origin',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'pos_purchase_orders'
    AND column_name = 'source_submission_id'
);
PREPARE add_po_source_submission_stmt FROM @add_po_source_submission_sql;
EXECUTE add_po_source_submission_stmt;
DEALLOCATE PREPARE add_po_source_submission_stmt;

SET @drop_po_status_check_sql = (
  SELECT IF(
    COUNT(*) > 0,
    'ALTER TABLE pos_purchase_orders DROP CHECK chk_pos_purchase_orders_status',
    'SELECT 1'
  )
  FROM information_schema.check_constraints
  WHERE constraint_schema = DATABASE()
    AND constraint_name = 'chk_pos_purchase_orders_status'
);
PREPARE drop_po_status_check_stmt FROM @drop_po_status_check_sql;
EXECUTE drop_po_status_check_stmt;
DEALLOCATE PREPARE drop_po_status_check_stmt;

ALTER TABLE pos_purchase_orders
  ADD CONSTRAINT chk_pos_purchase_orders_status
  CHECK (status IN (
    'DRAFT',
    'REQUESTED',
    'IN_REVIEW',
    'NEEDS_CLARIFICATION',
    'APPROVED',
    'ISSUED',
    'SENT',
    'CONFIRMED',
    'PARTIALLY_RECEIVED',
    'RECEIVED',
    'INVOICED',
    'VALIDATED_FOR_PAYMENT',
    'SCHEDULED_FOR_PAYMENT',
    'PAID',
    'CLOSED',
    'CANCELLED',
    'REJECTED'
  ));

SET @drop_po_origin_check_sql = (
  SELECT IF(
    COUNT(*) > 0,
    'ALTER TABLE pos_purchase_orders DROP CHECK chk_pos_purchase_orders_origin',
    'SELECT 1'
  )
  FROM information_schema.check_constraints
  WHERE constraint_schema = DATABASE()
    AND constraint_name = 'chk_pos_purchase_orders_origin'
);
PREPARE drop_po_origin_check_stmt FROM @drop_po_origin_check_sql;
EXECUTE drop_po_origin_check_stmt;
DEALLOCATE PREPARE drop_po_origin_check_stmt;

ALTER TABLE pos_purchase_orders
  ADD CONSTRAINT chk_pos_purchase_orders_origin
  CHECK (origin IN ('INDICE', 'SUPPLIER_KIOSK', 'POS_REPLENISHMENT', 'SALES', 'IMPORT'));

SET @add_po_origin_idx_sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE pos_purchase_orders ADD KEY idx_pos_purchase_orders_origin (company_id, origin)',
    'SELECT 1'
  )
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'pos_purchase_orders'
    AND index_name = 'idx_pos_purchase_orders_origin'
);
PREPARE add_po_origin_idx_stmt FROM @add_po_origin_idx_sql;
EXECUTE add_po_origin_idx_stmt;
DEALLOCATE PREPARE add_po_origin_idx_stmt;

CREATE TABLE IF NOT EXISTS pos_supplier_portal_access (
  id BIGINT NOT NULL AUTO_INCREMENT,
  company_id BIGINT NOT NULL,
  provider_id BIGINT NOT NULL,
  portal_code VARCHAR(120) NOT NULL,
  pin_hash VARCHAR(255) NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'ACTIVE',
  allowed_capabilities_json JSON NULL,
  expires_at TIMESTAMP NULL,
  created_by_user_id BIGINT NULL,
  updated_by_user_id BIGINT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  metadata_json JSON NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_pos_supplier_portal_access_code (company_id, portal_code),
  KEY idx_pos_supplier_portal_access_provider (company_id, provider_id),
  CONSTRAINT fk_pos_supplier_portal_access_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_pos_supplier_portal_access_provider FOREIGN KEY (provider_id) REFERENCES finance_providers(id) ON DELETE CASCADE,
  CONSTRAINT fk_pos_supplier_portal_access_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_pos_supplier_portal_access_updated_by FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_pos_supplier_portal_access_status CHECK (status IN ('ACTIVE', 'PAUSED', 'EXPIRED', 'REVOKED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pos_supplier_submissions (
  id BIGINT NOT NULL AUTO_INCREMENT,
  company_id BIGINT NOT NULL,
  provider_id BIGINT NOT NULL,
  portal_access_id BIGINT NULL,
  submission_number VARCHAR(80) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'SUBMITTED',
  currency_code VARCHAR(3) NOT NULL DEFAULT 'MXN',
  subtotal_amount DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
  tax_amount DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
  total_amount DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
  submitted_by_name VARCHAR(180) NULL,
  submitted_by_email VARCHAR(180) NULL,
  submitted_at TIMESTAMP NULL,
  reviewed_by_user_id BIGINT NULL,
  reviewed_at TIMESTAMP NULL,
  review_note TEXT NULL,
  converted_purchase_order_id BIGINT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  metadata_json JSON NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_pos_supplier_submissions_number (company_id, submission_number),
  KEY idx_pos_supplier_submissions_provider (company_id, provider_id),
  KEY idx_pos_supplier_submissions_status (company_id, status),
  KEY idx_pos_supplier_submissions_portal (company_id, portal_access_id),
  KEY idx_pos_supplier_submissions_converted_order (company_id, converted_purchase_order_id),
  CONSTRAINT fk_pos_supplier_submissions_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_pos_supplier_submissions_provider FOREIGN KEY (provider_id) REFERENCES finance_providers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_pos_supplier_submissions_portal FOREIGN KEY (portal_access_id) REFERENCES pos_supplier_portal_access(id) ON DELETE SET NULL,
  CONSTRAINT fk_pos_supplier_submissions_reviewed_by FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_pos_supplier_submissions_converted_order FOREIGN KEY (converted_purchase_order_id) REFERENCES pos_purchase_orders(id) ON DELETE SET NULL,
  CONSTRAINT chk_pos_supplier_submissions_status CHECK (status IN (
    'SUPPLIER_DRAFT',
    'SUBMITTED',
    'IN_REVIEW',
    'NEEDS_CLARIFICATION',
    'APPROVED',
    'PARTIALLY_APPROVED',
    'REJECTED',
    'CONVERTED_TO_PURCHASE_ORDER'
  )),
  CONSTRAINT chk_pos_supplier_submissions_amounts CHECK (subtotal_amount >= 0 AND tax_amount >= 0 AND total_amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pos_supplier_submission_items (
  id BIGINT NOT NULL AUTO_INCREMENT,
  company_id BIGINT NOT NULL,
  submission_id BIGINT NOT NULL,
  product_id BIGINT NULL,
  provider_sku VARCHAR(120) NULL,
  product_name VARCHAR(240) NOT NULL,
  product_description TEXT NULL,
  image_url TEXT NULL,
  quantity DECIMAL(19,4) NOT NULL,
  unit_cost_amount DECIMAL(19,4) NOT NULL,
  tax_rate DECIMAL(7,4) NOT NULL DEFAULT 0.0000,
  line_subtotal_amount DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
  line_tax_amount DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
  line_total_amount DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
  lead_time_days INT NULL,
  minimum_order_quantity DECIMAL(19,4) NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'SUBMITTED',
  review_note TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  metadata_json JSON NULL,
  PRIMARY KEY (id),
  KEY idx_pos_supplier_submission_items_submission (company_id, submission_id),
  KEY idx_pos_supplier_submission_items_product (company_id, product_id),
  CONSTRAINT fk_pos_supplier_submission_items_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_pos_supplier_submission_items_submission FOREIGN KEY (submission_id) REFERENCES pos_supplier_submissions(id) ON DELETE CASCADE,
  CONSTRAINT fk_pos_supplier_submission_items_product FOREIGN KEY (product_id) REFERENCES sales_products(id) ON DELETE SET NULL,
  CONSTRAINT chk_pos_supplier_submission_items_status CHECK (status IN ('SUBMITTED', 'APPROVED', 'REJECTED', 'NEEDS_CLARIFICATION', 'CONVERTED')),
  CONSTRAINT chk_pos_supplier_submission_items_amounts CHECK (
    quantity > 0 AND unit_cost_amount >= 0 AND tax_rate >= 0
    AND line_subtotal_amount >= 0 AND line_tax_amount >= 0 AND line_total_amount >= 0
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
