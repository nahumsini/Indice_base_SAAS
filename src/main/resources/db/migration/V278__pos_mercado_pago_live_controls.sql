ALTER TABLE pos_mercado_pago_connections
  ADD COLUMN live_activation_state VARCHAR(16) NOT NULL DEFAULT 'DISABLED' AFTER live_mode,
  ADD COLUMN live_activation_actor_user_id BIGINT NULL AFTER live_activation_state,
  ADD COLUMN live_activation_reason VARCHAR(500) NULL AFTER live_activation_actor_user_id,
  ADD COLUMN live_activation_changed_at DATETIME(6) NULL AFTER live_activation_reason,
  ADD COLUMN live_activated_at DATETIME(6) NULL AFTER live_activation_changed_at,
  ADD COLUMN live_suspended_at DATETIME(6) NULL AFTER live_activated_at,
  ADD COLUMN live_activation_version BIGINT NOT NULL DEFAULT 0 AFTER live_suspended_at,
  ADD KEY ix_mp_connection_activation (environment, live_activation_state, company_id),
  ADD CONSTRAINT fk_mp_connection_activation_actor FOREIGN KEY (live_activation_actor_user_id)
    REFERENCES users(id) ON DELETE RESTRICT,
  ADD CONSTRAINT ck_mp_connection_activation_state
    CHECK (live_activation_state IN ('DISABLED','PILOT','ACTIVE','SUSPENDED'));

ALTER TABLE pos_mercado_pago_terminals
  ADD COLUMN provider_last_seen_at DATETIME(6) NULL AFTER cash_register_id,
  ADD COLUMN provider_verified_at DATETIME(6) NULL AFTER provider_last_seen_at,
  ADD COLUMN verification_status VARCHAR(24) NOT NULL DEFAULT 'STALE' AFTER provider_verified_at,
  ADD COLUMN verification_failure_code VARCHAR(64) NULL AFTER verification_status,
  ADD COLUMN version BIGINT NOT NULL DEFAULT 0 AFTER verification_failure_code,
  ADD COLUMN verification_lease_id VARCHAR(36) NULL AFTER version,
  ADD COLUMN verification_lease_until DATETIME(6) NULL AFTER verification_lease_id,
  ADD KEY ix_mp_terminal_verification
    (company_id, connection_id, verification_status, provider_verified_at),
  ADD KEY ix_mp_terminal_verification_lease (verification_lease_until, verification_status),
  ADD CONSTRAINT ck_mp_terminal_verification_status
    CHECK (verification_status IN ('DISCOVERED','CONFIGURING','READY','STALE','UNAVAILABLE'));

CREATE TABLE pos_terminal_refund_adjustments (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT NOT NULL,
  reversal_id BIGINT NOT NULL,
  provider_code VARCHAR(24) NOT NULL,
  intent_id BIGINT NOT NULL,
  provider_payment_id VARCHAR(128) NOT NULL,
  provider_refund_id VARCHAR(128) NOT NULL,
  pos_ticket_id BIGINT NOT NULL,
  pos_payment_id BIGINT NULL,
  shift_id BIGINT NOT NULL,
  cash_closing_id BIGINT NOT NULL,
  cash_closing_settlement_id BIGINT NULL,
  payment_account_id BIGINT NULL,
  unit_id BIGINT NULL,
  business_id BIGINT NULL,
  amount DECIMAL(19,4) NOT NULL,
  currency_code VARCHAR(3) NOT NULL,
  state VARCHAR(32) NOT NULL,
  approved_by_user_id BIGINT NULL,
  approved_at DATETIME(6) NULL,
  approval_reason VARCHAR(500) NULL,
  posting_balance VARCHAR(16) NULL,
  treasury_movement_id BIGINT NULL,
  failure_code VARCHAR(64) NULL,
  failure_message VARCHAR(500) NULL,
  posted_at DATETIME(6) NULL,
  version BIGINT NOT NULL DEFAULT 0,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY uk_terminal_refund_adjustment_reversal (company_id, reversal_id),
  UNIQUE KEY uk_terminal_refund_adjustment_provider (company_id, provider_code, provider_refund_id),
  UNIQUE KEY uk_terminal_refund_adjustment_movement (treasury_movement_id),
  KEY ix_terminal_refund_adjustment_work (company_id, state, created_at),
  KEY ix_terminal_refund_adjustment_settlement
    (company_id, cash_closing_settlement_id, state, posting_balance),
  CONSTRAINT fk_terminal_refund_adjustment_company FOREIGN KEY (company_id)
    REFERENCES companies(id) ON DELETE RESTRICT,
  CONSTRAINT fk_terminal_refund_adjustment_reversal FOREIGN KEY (reversal_id)
    REFERENCES pos_terminal_payment_reversals(id) ON DELETE RESTRICT,
  CONSTRAINT fk_terminal_refund_adjustment_intent FOREIGN KEY (intent_id)
    REFERENCES pos_mercado_pago_payment_intents(id) ON DELETE RESTRICT,
  CONSTRAINT fk_terminal_refund_adjustment_ticket FOREIGN KEY (pos_ticket_id)
    REFERENCES pos_tickets(id) ON DELETE RESTRICT,
  CONSTRAINT fk_terminal_refund_adjustment_payment FOREIGN KEY (pos_payment_id)
    REFERENCES pos_payments(id) ON DELETE RESTRICT,
  CONSTRAINT fk_terminal_refund_adjustment_shift FOREIGN KEY (shift_id)
    REFERENCES pos_shifts(id) ON DELETE RESTRICT,
  CONSTRAINT fk_terminal_refund_adjustment_closing FOREIGN KEY (cash_closing_id)
    REFERENCES pos_cash_closings(id) ON DELETE RESTRICT,
  CONSTRAINT fk_terminal_refund_adjustment_settlement FOREIGN KEY (cash_closing_settlement_id)
    REFERENCES pos_cash_closing_settlements(id) ON DELETE RESTRICT,
  CONSTRAINT fk_terminal_refund_adjustment_account FOREIGN KEY (payment_account_id)
    REFERENCES finance_payment_accounts(id) ON DELETE RESTRICT,
  CONSTRAINT fk_terminal_refund_adjustment_unit FOREIGN KEY (unit_id)
    REFERENCES units(id) ON DELETE SET NULL,
  CONSTRAINT fk_terminal_refund_adjustment_business FOREIGN KEY (business_id)
    REFERENCES businesses(id) ON DELETE SET NULL,
  CONSTRAINT fk_terminal_refund_adjustment_approver FOREIGN KEY (approved_by_user_id)
    REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_terminal_refund_adjustment_treasury FOREIGN KEY (treasury_movement_id)
    REFERENCES finance_payment_account_movements(id) ON DELETE RESTRICT,
  CONSTRAINT ck_terminal_refund_adjustment_money CHECK (amount > 0),
  CONSTRAINT ck_terminal_refund_adjustment_state CHECK
    (state IN ('PENDING_REVIEW','APPROVED','POSTED','RECONCILIATION_REQUIRED','FAILED')),
  CONSTRAINT ck_terminal_refund_adjustment_balance CHECK
    (posting_balance IS NULL OR posting_balance IN ('PENDING','AVAILABLE'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pos_terminal_refund_adjustment_events (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT NOT NULL,
  adjustment_id BIGINT NOT NULL,
  event_key VARCHAR(190) NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  from_state VARCHAR(32) NULL,
  to_state VARCHAR(32) NOT NULL,
  actor_user_id BIGINT NULL,
  reason VARCHAR(500) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY uk_terminal_refund_adjustment_event (company_id, adjustment_id, event_key),
  KEY ix_terminal_refund_adjustment_event_time (company_id, created_at),
  CONSTRAINT fk_terminal_refund_adjustment_event_company FOREIGN KEY (company_id)
    REFERENCES companies(id) ON DELETE RESTRICT,
  CONSTRAINT fk_terminal_refund_adjustment_event_adjustment FOREIGN KEY (adjustment_id)
    REFERENCES pos_terminal_refund_adjustments(id) ON DELETE RESTRICT,
  CONSTRAINT fk_terminal_refund_adjustment_event_actor FOREIGN KEY (actor_user_id)
    REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT ck_terminal_refund_adjustment_event_state CHECK
    (to_state IN ('PENDING_REVIEW','APPROVED','POSTED','RECONCILIATION_REQUIRED','FAILED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
