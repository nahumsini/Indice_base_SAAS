ALTER TABLE finance_payment_accounts
  ADD COLUMN pending_balance DECIMAL(19,4) NOT NULL DEFAULT 0.0000 AFTER current_balance,
  ADD COLUMN system_key VARCHAR(96) NULL AFTER description,
  ADD COLUMN is_system_managed BOOLEAN NOT NULL DEFAULT FALSE AFTER system_key,
  ADD UNIQUE KEY uq_finance_payment_accounts_company_system_key (company_id, system_key);

ALTER TABLE finance_expense_payments
  ADD COLUMN idempotency_key VARCHAR(190) NULL AFTER source,
  ADD UNIQUE KEY uq_finance_expense_payments_idempotency (company_id, idempotency_key);

ALTER TABLE finance_petty_cash_settlement_lines
  ADD COLUMN cancellation_reason VARCHAR(500) NULL AFTER updated_by_user_id,
  ADD COLUMN cancelled_by_user_id BIGINT NULL AFTER cancellation_reason,
  ADD COLUMN cancelled_at TIMESTAMP NULL AFTER cancelled_by_user_id,
  ADD KEY idx_finance_petty_cash_settlement_lines_cancelled_by (cancelled_by_user_id),
  ADD CONSTRAINT fk_finance_petty_cash_settlement_lines_cancelled_by
    FOREIGN KEY (cancelled_by_user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE finance_petty_cash_movements
  ADD COLUMN external_source_name VARCHAR(180) NULL AFTER to_payment_account_id;

ALTER TABLE finance_petty_cash_settlement_lines
  DROP CHECK chk_finance_petty_cash_settlement_lines_status,
  ADD CONSTRAINT chk_finance_petty_cash_settlement_lines_status
    CHECK (status IN ('DRAFT', 'RECEIPT_ATTACHED', 'VALIDATED', 'EXPENSE_CREATED', 'REJECTED', 'REVERSED'));

CREATE TABLE IF NOT EXISTS finance_payment_account_movements (
  id BIGINT NOT NULL AUTO_INCREMENT,
  company_id BIGINT NOT NULL,
  payment_account_id BIGINT NOT NULL,
  unit_id BIGINT NULL,
  business_id BIGINT NULL,
  currency_code VARCHAR(3) NOT NULL,
  source_module VARCHAR(48) NOT NULL,
  source_type VARCHAR(64) NOT NULL,
  source_id VARCHAR(120) NULL,
  event_key VARCHAR(190) NOT NULL,
  available_delta DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
  pending_delta DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
  description VARCHAR(500) NOT NULL,
  occurred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by_user_id BIGINT NULL,
  reversal_of_movement_id BIGINT NULL,
  metadata_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_finance_payment_account_movements_event (company_id, event_key),
  KEY idx_finance_payment_account_movements_account (company_id, payment_account_id, occurred_at),
  KEY idx_finance_payment_account_movements_source (company_id, source_module, source_type, source_id),
  KEY idx_finance_payment_account_movements_reversal (reversal_of_movement_id),
  CONSTRAINT fk_finance_payment_account_movements_company
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_finance_payment_account_movements_account
    FOREIGN KEY (payment_account_id) REFERENCES finance_payment_accounts(id) ON DELETE RESTRICT,
  CONSTRAINT fk_finance_payment_account_movements_unit
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL,
  CONSTRAINT fk_finance_payment_account_movements_business
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL,
  CONSTRAINT fk_finance_payment_account_movements_created_by
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_finance_payment_account_movements_reversal
    FOREIGN KEY (reversal_of_movement_id) REFERENCES finance_payment_account_movements(id) ON DELETE RESTRICT,
  CONSTRAINT chk_finance_payment_account_movements_delta
    CHECK (available_delta <> 0 OR pending_delta <> 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO finance_payment_account_movements (
  company_id,
  payment_account_id,
  unit_id,
  business_id,
  currency_code,
  source_module,
  source_type,
  source_id,
  event_key,
  available_delta,
  pending_delta,
  description,
  occurred_at,
  created_by_user_id,
  metadata_json
)
SELECT
  account.company_id,
  account.id,
  account.unit_id,
  account.business_id,
  account.currency_code,
  'FINANCE',
  'LEGACY_BALANCE_BASELINE',
  CAST(account.id AS CHAR),
  CONCAT('PAYMENT_ACCOUNT_BASELINE:', account.id),
  account.current_balance,
  0.0000,
  'Saldo existente al activar el libro de movimientos de Tesorería',
  COALESCE(account.updated_at, account.created_at),
  account.updated_by_user_id,
  JSON_OBJECT('migration', 'V252')
FROM finance_payment_accounts account
WHERE account.deleted_at IS NULL
  AND account.current_balance <> 0.0000;

ALTER TABLE pos_cash_registers
  ADD COLUMN retained_cash_amount DECIMAL(19,4) NOT NULL DEFAULT 0.0000 AFTER notes,
  ADD CONSTRAINT chk_pos_cash_registers_retained_cash CHECK (retained_cash_amount >= 0);

CREATE TABLE IF NOT EXISTS pos_cash_register_settlement_rules (
  id BIGINT NOT NULL AUTO_INCREMENT,
  company_id BIGINT NOT NULL,
  cash_register_id BIGINT NOT NULL,
  payment_method VARCHAR(32) NOT NULL,
  currency_code VARCHAR(3) NOT NULL,
  destination_payment_account_id BIGINT NULL,
  settlement_timing VARCHAR(24) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  review_status VARCHAR(24) NOT NULL DEFAULT 'READY',
  created_by_user_id BIGINT NOT NULL,
  updated_by_user_id BIGINT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  version BIGINT NOT NULL DEFAULT 0,
  metadata_json JSON NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pos_cash_register_settlement_rule (company_id, cash_register_id, payment_method, currency_code),
  KEY idx_pos_cash_register_settlement_rules_account (destination_payment_account_id),
  KEY idx_pos_cash_register_settlement_rules_register (company_id, cash_register_id),
  CONSTRAINT fk_pos_cash_register_settlement_rules_company
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_pos_cash_register_settlement_rules_register
    FOREIGN KEY (cash_register_id) REFERENCES pos_cash_registers(id) ON DELETE CASCADE,
  CONSTRAINT fk_pos_cash_register_settlement_rules_account
    FOREIGN KEY (destination_payment_account_id) REFERENCES finance_payment_accounts(id) ON DELETE RESTRICT,
  CONSTRAINT fk_pos_cash_register_settlement_rules_created_by
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_pos_cash_register_settlement_rules_updated_by
    FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_pos_cash_register_settlement_rules_method
    CHECK (payment_method IN ('CASH', 'CARD', 'TRANSFER', 'WALLET', 'CREDIT')),
  CONSTRAINT chk_pos_cash_register_settlement_rules_timing
    CHECK (settlement_timing IN ('IMMEDIATE', 'DEFERRED')),
  CONSTRAINT chk_pos_cash_register_settlement_rules_review
    CHECK (review_status IN ('READY', 'NEEDS_REVIEW')),
  CONSTRAINT chk_pos_cash_register_settlement_rules_destination
    CHECK (
      enabled = FALSE
      OR (payment_method = 'CREDIT' AND destination_payment_account_id IS NULL)
      OR (payment_method <> 'CREDIT' AND destination_payment_account_id IS NOT NULL)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pos_cash_closing_settlements (
  id BIGINT NOT NULL AUTO_INCREMENT,
  company_id BIGINT NOT NULL,
  cash_closing_id BIGINT NOT NULL,
  shift_id BIGINT NOT NULL,
  cash_register_id BIGINT NOT NULL,
  payment_method VARCHAR(32) NOT NULL,
  currency_code VARCHAR(3) NOT NULL,
  gross_amount DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
  retained_cash_amount DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
  transferable_amount DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
  destination_payment_account_id BIGINT NOT NULL,
  settlement_timing VARCHAR(24) NOT NULL,
  pending_amount DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
  settled_amount DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
  variance_amount DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
  status VARCHAR(32) NOT NULL,
  policy_snapshot_json JSON NOT NULL,
  settled_at TIMESTAMP NULL,
  settled_by_user_id BIGINT NULL,
  created_by_user_id BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  version BIGINT NOT NULL DEFAULT 0,
  metadata_json JSON NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pos_cash_closing_settlement_method (company_id, cash_closing_id, payment_method),
  KEY idx_pos_cash_closing_settlements_status (company_id, status, created_at),
  KEY idx_pos_cash_closing_settlements_account (destination_payment_account_id),
  CONSTRAINT fk_pos_cash_closing_settlements_company
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_pos_cash_closing_settlements_closing
    FOREIGN KEY (cash_closing_id) REFERENCES pos_cash_closings(id) ON DELETE RESTRICT,
  CONSTRAINT fk_pos_cash_closing_settlements_shift
    FOREIGN KEY (shift_id) REFERENCES pos_shifts(id) ON DELETE RESTRICT,
  CONSTRAINT fk_pos_cash_closing_settlements_register
    FOREIGN KEY (cash_register_id) REFERENCES pos_cash_registers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_pos_cash_closing_settlements_account
    FOREIGN KEY (destination_payment_account_id) REFERENCES finance_payment_accounts(id) ON DELETE RESTRICT,
  CONSTRAINT fk_pos_cash_closing_settlements_settled_by
    FOREIGN KEY (settled_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_pos_cash_closing_settlements_created_by
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT chk_pos_cash_closing_settlements_method
    CHECK (payment_method IN ('CASH', 'CARD', 'TRANSFER', 'WALLET')),
  CONSTRAINT chk_pos_cash_closing_settlements_timing
    CHECK (settlement_timing IN ('IMMEDIATE', 'DEFERRED')),
  CONSTRAINT chk_pos_cash_closing_settlements_status
    CHECK (status IN ('SETTLED', 'PENDING', 'RECONCILIATION_REQUIRED', 'REVERSED')),
  CONSTRAINT chk_pos_cash_closing_settlements_amounts
    CHECK (
      gross_amount >= 0
      AND retained_cash_amount >= 0
      AND transferable_amount >= 0
      AND pending_amount >= 0
      AND settled_amount >= 0
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
