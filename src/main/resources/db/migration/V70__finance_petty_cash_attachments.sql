CREATE TABLE IF NOT EXISTS finance_petty_cash_settlement_line_attachments (
  id BIGINT NOT NULL AUTO_INCREMENT,
  company_id BIGINT NOT NULL,
  petty_cash_fund_id BIGINT NOT NULL,
  petty_cash_statement_id BIGINT NOT NULL,
  settlement_line_id BIGINT NOT NULL,
  expense_id BIGINT NULL,
  original_filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  size_bytes BIGINT NOT NULL,
  object_key VARCHAR(512) NOT NULL,
  uploaded_by_user_id BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_finance_petty_cash_line_attachments_object_key (company_id, object_key),
  KEY idx_finance_petty_cash_line_attachments_line (settlement_line_id, deleted_at),
  KEY idx_finance_petty_cash_line_attachments_fund (petty_cash_fund_id, deleted_at),
  KEY idx_finance_petty_cash_line_attachments_statement (petty_cash_statement_id, deleted_at),
  KEY idx_finance_petty_cash_line_attachments_expense (expense_id),
  KEY idx_finance_petty_cash_line_attachments_company (company_id, deleted_at),
  CONSTRAINT fk_finance_petty_cash_line_attachments_company
    FOREIGN KEY (company_id) REFERENCES companies(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_finance_petty_cash_line_attachments_fund
    FOREIGN KEY (petty_cash_fund_id) REFERENCES finance_petty_cash_funds(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_finance_petty_cash_line_attachments_statement
    FOREIGN KEY (petty_cash_statement_id) REFERENCES finance_petty_cash_statements(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_finance_petty_cash_line_attachments_line
    FOREIGN KEY (settlement_line_id) REFERENCES finance_petty_cash_settlement_lines(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_finance_petty_cash_line_attachments_expense
    FOREIGN KEY (expense_id) REFERENCES finance_expenses(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_finance_petty_cash_line_attachments_uploaded_by
    FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id)
    ON DELETE RESTRICT,
  CONSTRAINT chk_finance_petty_cash_line_attachments_size
    CHECK (size_bytes > 0)
);
