CREATE TABLE IF NOT EXISTS finance_receivable_installments (
  id BIGINT NOT NULL AUTO_INCREMENT,
  company_id BIGINT NOT NULL,
  receivable_id BIGINT NOT NULL,
  credit_sale_id BIGINT NOT NULL,
  installment_number INT NOT NULL,
  due_date DATE NOT NULL,
  amount DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
  paid_amount DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
  balance_amount DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
  currency_code VARCHAR(3) NOT NULL,
  status VARCHAR(40) NOT NULL,
  paid_at DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  version BIGINT NOT NULL DEFAULT 0,
  metadata_json JSON NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_finance_receivable_installment_number (receivable_id, installment_number),
  KEY idx_finance_receivable_installments_company (company_id),
  KEY idx_finance_receivable_installments_receivable (receivable_id),
  KEY idx_finance_receivable_installments_due_date (company_id, due_date),
  KEY idx_finance_receivable_installments_status (company_id, status),
  CONSTRAINT fk_finance_receivable_installments_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_finance_receivable_installments_receivable FOREIGN KEY (receivable_id) REFERENCES finance_receivable_accounts(id) ON DELETE CASCADE,
  CONSTRAINT fk_finance_receivable_installments_credit_sale FOREIGN KEY (credit_sale_id) REFERENCES finance_credit_sales(id) ON DELETE CASCADE,
  CONSTRAINT chk_finance_receivable_installments_status CHECK (status IN ('ON_TIME', 'DUE_SOON', 'OVERDUE', 'PARTIAL', 'PAID', 'CANCELLED')),
  CONSTRAINT chk_finance_receivable_installments_amounts CHECK (
    installment_number > 0
    AND amount > 0
    AND paid_amount >= 0
    AND balance_amount >= 0
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
