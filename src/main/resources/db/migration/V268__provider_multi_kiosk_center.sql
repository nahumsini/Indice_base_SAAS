ALTER TABLE multi_kiosk_definitions
  ADD COLUMN audience_type VARCHAR(24) NOT NULL DEFAULT 'EMPLOYEE' AFTER description,
  ADD COLUMN allow_provider_registration TINYINT(1) NOT NULL DEFAULT 0 AFTER audience_type,
  ADD COLUMN provider_company_id BIGINT
    GENERATED ALWAYS AS (
      CASE WHEN audience_type = 'PROVIDER' AND status IN ('ACTIVE', 'DISABLED')
           THEN company_id ELSE NULL END
    ) STORED
    AFTER allow_provider_registration,
  ADD UNIQUE KEY uq_multi_kiosk_provider_company (provider_company_id),
  ADD KEY idx_multi_kiosk_company_audience (company_id, audience_type, status);

ALTER TABLE multi_kiosk_definitions
  ADD CONSTRAINT chk_multi_kiosk_audience_type
    CHECK (audience_type IN ('EMPLOYEE', 'PROVIDER'));

ALTER TABLE multi_kiosk_sessions
  MODIFY COLUMN user_id BIGINT NULL,
  MODIFY COLUMN user_company_id BIGINT NULL,
  ADD COLUMN identity_type VARCHAR(24) NOT NULL DEFAULT 'EMPLOYEE' AFTER company_id,
  ADD COLUMN identity_id BIGINT NULL AFTER identity_type,
  ADD KEY idx_multi_kiosk_session_principal
    (company_id, identity_type, identity_id, expires_at);

UPDATE multi_kiosk_sessions
SET identity_type = 'EMPLOYEE', identity_id = user_company_id
WHERE identity_id IS NULL;

ALTER TABLE multi_kiosk_sessions
  ADD CONSTRAINT chk_multi_kiosk_identity_type
    CHECK (identity_type IN ('EMPLOYEE', 'PROVIDER'));

CREATE TABLE provider_registration_requests (
  id BIGINT NOT NULL AUTO_INCREMENT,
  company_id BIGINT NOT NULL,
  name VARCHAR(180) NOT NULL,
  legal_name VARCHAR(220) NULL,
  tax_id VARCHAR(80) NULL,
  email VARCHAR(180) NOT NULL,
  phone VARCHAR(60) NULL,
  contact_name VARCHAR(180) NOT NULL,
  notes TEXT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'SUBMITTED',
  unit_id BIGINT NULL,
  business_id BIGINT NULL,
  review_note TEXT NULL,
  reviewed_by_user_id BIGINT NULL,
  reviewed_at TIMESTAMP NULL,
  provider_id BIGINT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_provider_registration_company_status (company_id, status, created_at),
  KEY idx_provider_registration_identity (company_id, tax_id, email),
  CONSTRAINT fk_provider_registration_company
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_provider_registration_unit
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL,
  CONSTRAINT fk_provider_registration_business
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL,
  CONSTRAINT fk_provider_registration_reviewer
    FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_provider_registration_provider
    FOREIGN KEY (provider_id) REFERENCES finance_providers(id) ON DELETE SET NULL,
  CONSTRAINT chk_provider_registration_status
    CHECK (status IN ('SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE provider_profile_change_requests (
  id BIGINT NOT NULL AUTO_INCREMENT,
  company_id BIGINT NOT NULL,
  provider_id BIGINT NOT NULL,
  category VARCHAR(24) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'SUBMITTED',
  changes_json JSON NOT NULL,
  protected_changes TEXT NULL,
  submitted_by_name VARCHAR(180) NULL,
  submitted_by_email VARCHAR(180) NULL,
  review_note TEXT NULL,
  reviewed_by_user_id BIGINT NULL,
  reviewed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_provider_change_company_provider (company_id, provider_id, created_at),
  KEY idx_provider_change_company_status (company_id, status, category),
  CONSTRAINT fk_provider_change_company
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_provider_change_provider
    FOREIGN KEY (provider_id) REFERENCES finance_providers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_provider_change_reviewer
    FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_provider_change_category
    CHECK (category IN ('COMMERCIAL', 'CATALOG', 'FISCAL', 'BANKING')),
  CONSTRAINT chk_provider_change_status
    CHECK (status IN ('SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE provider_private_profiles (
  provider_id BIGINT NOT NULL,
  company_id BIGINT NOT NULL,
  fiscal_profile_json JSON NULL,
  protected_banking_profile TEXT NULL,
  updated_by_user_id BIGINT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (provider_id),
  KEY idx_provider_private_company (company_id, provider_id),
  CONSTRAINT fk_provider_private_company
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_provider_private_provider
    FOREIGN KEY (provider_id) REFERENCES finance_providers(id) ON DELETE CASCADE,
  CONSTRAINT fk_provider_private_updated_by
    FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pos_supplier_quote_requests (
  id BIGINT NOT NULL AUTO_INCREMENT,
  company_id BIGINT NOT NULL,
  unit_id BIGINT NOT NULL,
  business_id BIGINT NOT NULL,
  provider_id BIGINT NOT NULL,
  request_number VARCHAR(80) NOT NULL,
  title VARCHAR(240) NOT NULL,
  description TEXT NULL,
  currency_code VARCHAR(3) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  response_deadline TIMESTAMP NOT NULL,
  created_by_user_id BIGINT NOT NULL,
  opened_at TIMESTAMP NULL,
  closed_at TIMESTAMP NULL,
  cancelled_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_supplier_quote_request_number (company_id, request_number),
  KEY idx_supplier_quote_provider (company_id, provider_id, status, response_deadline),
  KEY idx_supplier_quote_scope (company_id, unit_id, business_id),
  CONSTRAINT fk_supplier_quote_company
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_supplier_quote_unit
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE RESTRICT,
  CONSTRAINT fk_supplier_quote_business
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE RESTRICT,
  CONSTRAINT fk_supplier_quote_provider
    FOREIGN KEY (provider_id) REFERENCES finance_providers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_supplier_quote_creator
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT chk_supplier_quote_status
    CHECK (status IN ('DRAFT', 'OPEN', 'CLOSED', 'CANCELLED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pos_supplier_quote_request_items (
  id BIGINT NOT NULL AUTO_INCREMENT,
  company_id BIGINT NOT NULL,
  quote_request_id BIGINT NOT NULL,
  product_id BIGINT NULL,
  sku_snapshot VARCHAR(120) NULL,
  product_name_snapshot VARCHAR(240) NOT NULL,
  requested_quantity DECIMAL(19,4) NOT NULL,
  notes TEXT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_supplier_quote_item_request (company_id, quote_request_id, sort_order),
  CONSTRAINT fk_supplier_quote_item_company
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_supplier_quote_item_request
    FOREIGN KEY (quote_request_id) REFERENCES pos_supplier_quote_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_supplier_quote_item_product
    FOREIGN KEY (product_id) REFERENCES sales_products(id) ON DELETE SET NULL,
  CONSTRAINT chk_supplier_quote_item_quantity CHECK (requested_quantity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE pos_supplier_submissions
  ADD COLUMN quote_request_id BIGINT NULL AFTER portal_access_id,
  ADD COLUMN revision_number INT NOT NULL DEFAULT 1 AFTER quote_request_id,
  ADD COLUMN supersedes_submission_id BIGINT NULL AFTER revision_number,
  ADD KEY idx_supplier_submission_quote
    (company_id, quote_request_id, revision_number),
  ADD CONSTRAINT fk_supplier_submission_quote
    FOREIGN KEY (quote_request_id) REFERENCES pos_supplier_quote_requests(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_supplier_submission_supersedes
    FOREIGN KEY (supersedes_submission_id) REFERENCES pos_supplier_submissions(id) ON DELETE SET NULL;

ALTER TABLE pos_supplier_invoices
  ADD COLUMN submitted_by_email VARCHAR(180) NULL AFTER submitted_by_name;

ALTER TABLE pos_supplier_submissions
  DROP CHECK chk_pos_supplier_submissions_status;

ALTER TABLE pos_supplier_submissions
  ADD CONSTRAINT chk_pos_supplier_submissions_status CHECK (status IN (
    'SUPPLIER_DRAFT',
    'SUBMITTED',
    'IN_REVIEW',
    'NEEDS_CLARIFICATION',
    'APPROVED',
    'PARTIALLY_APPROVED',
    'REJECTED',
    'CONVERTED_TO_PURCHASE_ORDER',
    'SUPERSEDED'
  ));

CREATE TABLE pos_purchase_order_supplier_responses (
  id BIGINT NOT NULL AUTO_INCREMENT,
  company_id BIGINT NOT NULL,
  purchase_order_id BIGINT NOT NULL,
  provider_id BIGINT NOT NULL,
  response_type VARCHAR(32) NOT NULL,
  requested_expected_date DATE NULL,
  reason TEXT NULL,
  submitted_by_name VARCHAR(180) NULL,
  submitted_by_email VARCHAR(180) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_po_supplier_response_order (company_id, purchase_order_id, created_at),
  KEY idx_po_supplier_response_provider (company_id, provider_id, created_at),
  CONSTRAINT fk_po_supplier_response_company
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_po_supplier_response_order
    FOREIGN KEY (purchase_order_id) REFERENCES pos_purchase_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_po_supplier_response_provider
    FOREIGN KEY (provider_id) REFERENCES finance_providers(id) ON DELETE RESTRICT,
  CONSTRAINT chk_po_supplier_response_type
    CHECK (response_type IN ('CONFIRMED', 'ADJUSTMENT_REQUESTED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
