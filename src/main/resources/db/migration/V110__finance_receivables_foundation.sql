INSERT INTO modules (slug, name, description, icon, badge_text, tier, sort_order, is_core, is_active)
SELECT
    'receivables',
    'Cartera',
    'Ventas a credito, cuentas por cobrar y abonos',
    'bi-cash-coin',
    NULL,
    'pro',
    6,
    0,
    1
WHERE NOT EXISTS (
    SELECT 1
    FROM modules
    WHERE slug = 'receivables'
);

CREATE TABLE IF NOT EXISTS finance_credit_policies (
  id BIGINT NOT NULL AUTO_INCREMENT,
  company_id BIGINT NOT NULL,
  unit_id BIGINT NULL,
  business_id BIGINT NULL,
  contact_id BIGINT NULL,
  customer_name VARCHAR(220) NOT NULL,
  credit_line_amount DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
  monthly_purchase_limit_amount DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
  available_credit_amount DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
  default_term_months INT NOT NULL DEFAULT 1,
  annual_interest_rate DECIMAL(9,4) NOT NULL DEFAULT 0.0000,
  status VARCHAR(40) NOT NULL,
  notes TEXT NULL,
  created_by_user_id BIGINT NULL,
  updated_by_user_id BIGINT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  version BIGINT NOT NULL DEFAULT 0,
  custom_fields_json JSON NULL,
  metadata_json JSON NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_finance_credit_policies_company_contact (company_id, contact_id),
  KEY idx_finance_credit_policies_company (company_id),
  KEY idx_finance_credit_policies_company_unit (company_id, unit_id),
  KEY idx_finance_credit_policies_company_business (company_id, business_id),
  KEY idx_finance_credit_policies_company_status (company_id, status),
  KEY idx_finance_credit_policies_customer (company_id, customer_name),
  CONSTRAINT fk_finance_credit_policies_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_finance_credit_policies_unit FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL,
  CONSTRAINT fk_finance_credit_policies_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL,
  CONSTRAINT fk_finance_credit_policies_contact FOREIGN KEY (contact_id) REFERENCES sales_contacts(id) ON DELETE SET NULL,
  CONSTRAINT fk_finance_credit_policies_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_finance_credit_policies_updated_by FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_finance_credit_policies_amounts CHECK (
    credit_line_amount >= 0
    AND monthly_purchase_limit_amount >= 0
    AND available_credit_amount >= 0
    AND default_term_months > 0
    AND annual_interest_rate >= 0
  ),
  CONSTRAINT chk_finance_credit_policies_status CHECK (status IN ('ACTIVE', 'REVIEW', 'BLOCKED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS finance_credit_sales (
  id BIGINT NOT NULL AUTO_INCREMENT,
  company_id BIGINT NOT NULL,
  unit_id BIGINT NULL,
  business_id BIGINT NULL,
  sales_record_id BIGINT NULL,
  pos_ticket_id BIGINT NULL,
  contact_id BIGINT NULL,
  sale_number VARCHAR(80) NOT NULL,
  customer_name VARCHAR(220) NOT NULL,
  source VARCHAR(40) NOT NULL,
  sale_date DATE NOT NULL,
  original_amount DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
  financed_amount DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
  currency_code VARCHAR(3) NOT NULL,
  status VARCHAR(40) NOT NULL,
  selected_simulation_key VARCHAR(80) NOT NULL,
  selected_simulation_name VARCHAR(120) NOT NULL,
  term_months INT NOT NULL,
  annual_interest_rate DECIMAL(9,4) NOT NULL DEFAULT 0.0000,
  monthly_payment_amount DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
  total_interest_amount DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
  total_payable_amount DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
  first_due_date DATE NOT NULL,
  due_date DATE NOT NULL,
  created_by_user_id BIGINT NULL,
  updated_by_user_id BIGINT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  version BIGINT NOT NULL DEFAULT 0,
  custom_fields_json JSON NULL,
  metadata_json JSON NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_finance_credit_sales_company_sales_record (company_id, sales_record_id),
  KEY idx_finance_credit_sales_company (company_id),
  KEY idx_finance_credit_sales_company_unit (company_id, unit_id),
  KEY idx_finance_credit_sales_company_business (company_id, business_id),
  KEY idx_finance_credit_sales_company_status (company_id, status),
  KEY idx_finance_credit_sales_sale_date (company_id, sale_date),
  KEY idx_finance_credit_sales_contact (company_id, contact_id),
  CONSTRAINT fk_finance_credit_sales_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_finance_credit_sales_unit FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL,
  CONSTRAINT fk_finance_credit_sales_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL,
  CONSTRAINT fk_finance_credit_sales_sales_record FOREIGN KEY (sales_record_id) REFERENCES sales_records(id) ON DELETE SET NULL,
  CONSTRAINT fk_finance_credit_sales_pos_ticket FOREIGN KEY (pos_ticket_id) REFERENCES pos_tickets(id) ON DELETE SET NULL,
  CONSTRAINT fk_finance_credit_sales_contact FOREIGN KEY (contact_id) REFERENCES sales_contacts(id) ON DELETE SET NULL,
  CONSTRAINT fk_finance_credit_sales_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_finance_credit_sales_updated_by FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_finance_credit_sales_source CHECK (source IN ('SALES', 'POS', 'MANUAL')),
  CONSTRAINT chk_finance_credit_sales_status CHECK (status IN ('DRAFT', 'SIMULATED', 'APPROVED', 'ACTIVE', 'COMPLETED', 'REJECTED', 'CANCELLED')),
  CONSTRAINT chk_finance_credit_sales_amounts CHECK (
    original_amount >= 0
    AND financed_amount > 0
    AND term_months > 0
    AND annual_interest_rate >= 0
    AND monthly_payment_amount >= 0
    AND total_interest_amount >= 0
    AND total_payable_amount >= financed_amount
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS finance_receivable_accounts (
  id BIGINT NOT NULL AUTO_INCREMENT,
  company_id BIGINT NOT NULL,
  unit_id BIGINT NULL,
  business_id BIGINT NULL,
  credit_sale_id BIGINT NOT NULL,
  sales_record_id BIGINT NULL,
  pos_ticket_id BIGINT NULL,
  contact_id BIGINT NULL,
  sale_number VARCHAR(80) NOT NULL,
  customer_name VARCHAR(220) NOT NULL,
  original_amount DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
  total_payable_amount DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
  paid_amount DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
  balance_amount DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
  currency_code VARCHAR(3) NOT NULL,
  due_date DATE NOT NULL,
  next_payment_date DATE NOT NULL,
  installment_amount DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
  term_months INT NOT NULL,
  annual_interest_rate DECIMAL(9,4) NOT NULL DEFAULT 0.0000,
  status VARCHAR(40) NOT NULL,
  created_by_user_id BIGINT NULL,
  updated_by_user_id BIGINT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  version BIGINT NOT NULL DEFAULT 0,
  custom_fields_json JSON NULL,
  metadata_json JSON NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_finance_receivable_accounts_credit_sale (credit_sale_id),
  KEY idx_finance_receivable_accounts_company (company_id),
  KEY idx_finance_receivable_accounts_company_unit (company_id, unit_id),
  KEY idx_finance_receivable_accounts_company_business (company_id, business_id),
  KEY idx_finance_receivable_accounts_status (company_id, status),
  KEY idx_finance_receivable_accounts_due_date (company_id, due_date),
  KEY idx_finance_receivable_accounts_contact (company_id, contact_id),
  CONSTRAINT fk_finance_receivable_accounts_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_finance_receivable_accounts_unit FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL,
  CONSTRAINT fk_finance_receivable_accounts_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL,
  CONSTRAINT fk_finance_receivable_accounts_credit_sale FOREIGN KEY (credit_sale_id) REFERENCES finance_credit_sales(id) ON DELETE CASCADE,
  CONSTRAINT fk_finance_receivable_accounts_sales_record FOREIGN KEY (sales_record_id) REFERENCES sales_records(id) ON DELETE SET NULL,
  CONSTRAINT fk_finance_receivable_accounts_pos_ticket FOREIGN KEY (pos_ticket_id) REFERENCES pos_tickets(id) ON DELETE SET NULL,
  CONSTRAINT fk_finance_receivable_accounts_contact FOREIGN KEY (contact_id) REFERENCES sales_contacts(id) ON DELETE SET NULL,
  CONSTRAINT fk_finance_receivable_accounts_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_finance_receivable_accounts_updated_by FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_finance_receivable_accounts_status CHECK (status IN ('ON_TIME', 'DUE_SOON', 'OVERDUE', 'PAID', 'RESTRUCTURED', 'CANCELLED')),
  CONSTRAINT chk_finance_receivable_accounts_amounts CHECK (
    original_amount >= 0
    AND total_payable_amount >= original_amount
    AND paid_amount >= 0
    AND balance_amount >= 0
    AND installment_amount >= 0
    AND term_months > 0
    AND annual_interest_rate >= 0
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS finance_receivable_payments (
  id BIGINT NOT NULL AUTO_INCREMENT,
  company_id BIGINT NOT NULL,
  receivable_id BIGINT NOT NULL,
  payment_date DATE NOT NULL,
  payment_method VARCHAR(40) NOT NULL,
  amount DECIMAL(19,4) NOT NULL,
  currency_code VARCHAR(3) NOT NULL,
  reference VARCHAR(160) NULL,
  registered_by_user_id BIGINT NULL,
  registered_by_name VARCHAR(180) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  custom_fields_json JSON NULL,
  metadata_json JSON NULL,
  PRIMARY KEY (id),
  KEY idx_finance_receivable_payments_company (company_id),
  KEY idx_finance_receivable_payments_receivable (receivable_id),
  KEY idx_finance_receivable_payments_payment_date (company_id, payment_date),
  CONSTRAINT fk_finance_receivable_payments_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_finance_receivable_payments_receivable FOREIGN KEY (receivable_id) REFERENCES finance_receivable_accounts(id) ON DELETE CASCADE,
  CONSTRAINT fk_finance_receivable_payments_registered_by FOREIGN KEY (registered_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_finance_receivable_payments_method CHECK (payment_method IN ('CASH', 'CARD', 'TRANSFER', 'CHECK', 'WALLET')),
  CONSTRAINT chk_finance_receivable_payments_amount CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
