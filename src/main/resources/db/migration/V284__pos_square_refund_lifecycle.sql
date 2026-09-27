ALTER TABLE pos_square_terminal_payment_intents
  DROP INDEX uk_pos_square_intents_open_shift,
  DROP CHECK chk_pos_square_intents_status,
  ADD UNIQUE KEY uk_pos_square_intent_owner (company_id, id),
  MODIFY COLUMN recoverable_register_id BIGINT GENERATED ALWAYS AS
    (CASE WHEN status IN ('WAITING','APPROVED','UNCERTAIN','PARTIALLY_REFUNDED')
      AND pos_ticket_id IS NULL THEN cash_register_id ELSE NULL END) STORED,
  MODIFY COLUMN recoverable_shift_id BIGINT GENERATED ALWAYS AS
    (CASE WHEN status IN ('WAITING','APPROVED','UNCERTAIN','PARTIALLY_REFUNDED')
      AND pos_ticket_id IS NULL THEN shift_id ELSE NULL END) STORED,
  ADD UNIQUE KEY uk_pos_square_intents_open_shift
    (company_id, recoverable_register_id, recoverable_shift_id),
  ADD CONSTRAINT chk_pos_square_intents_status CHECK
    (status IN ('WAITING','APPROVED','DECLINED','CANCELLED','UNCERTAIN',
      'PARTIALLY_REFUNDED','REFUNDED'));

CREATE TABLE pos_square_refund_requests (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT NOT NULL,
  intent_id BIGINT NOT NULL,
  request_key VARCHAR(45) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  amount DECIMAL(19,4) NOT NULL,
  baseline_amount DECIMAL(19,4) NOT NULL,
  currency_code VARCHAR(3) NOT NULL,
  request_json JSON NOT NULL,
  payload_hash CHAR(64) NOT NULL,
  reason VARCHAR(500) NOT NULL,
  environment VARCHAR(24) NOT NULL,
  merchant_id VARCHAR(128) NOT NULL,
  provider_refund_id VARCHAR(128) NULL,
  verified_evidence_json JSON NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'WAITING',
  requested_by_user_id BIGINT NOT NULL,
  requested_by_role VARCHAR(40) NOT NULL,
  requested_scope_type VARCHAR(40) NOT NULL,
  requested_scope_unit_id BIGINT NULL,
  requested_scope_business_id BIGINT NULL,
  work_lease_id VARCHAR(36) NULL,
  work_lease_until DATETIME(6) NULL,
  submission_attempts INT NOT NULL DEFAULT 0,
  manual_replay_attempts INT NOT NULL DEFAULT 0,
  recovery_attempts INT NOT NULL DEFAULT 0,
  next_attempt_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  last_error_code VARCHAR(80) NULL,
  last_provider_check_at DATETIME(6) NULL,
  dead_lettered_at DATETIME(6) NULL,
  version BIGINT NOT NULL DEFAULT 0,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  active_intent_id BIGINT GENERATED ALWAYS AS
    (CASE WHEN status IN ('WAITING','SUBMITTING','PENDING','UNCERTAIN',
      'RECONCILIATION_REQUIRED','DEAD_LETTER') THEN intent_id ELSE NULL END) STORED,
  UNIQUE KEY uk_square_refund_key (company_id, request_key),
  UNIQUE KEY uk_square_refund_provider (company_id, provider_refund_id),
  UNIQUE KEY uk_square_refund_active_intent (company_id, active_intent_id),
  KEY ix_square_refund_recovery (status, next_attempt_at, work_lease_until),
  CONSTRAINT fk_square_refund_company FOREIGN KEY (company_id)
    REFERENCES companies(id) ON DELETE RESTRICT,
  CONSTRAINT fk_square_refund_intent FOREIGN KEY (company_id, intent_id)
    REFERENCES pos_square_terminal_payment_intents(company_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_square_refund_actor FOREIGN KEY (requested_by_user_id)
    REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT ck_square_refund_money CHECK (amount>0 AND baseline_amount>=0),
  CONSTRAINT ck_square_refund_status CHECK
    (status IN ('WAITING','SUBMITTING','PENDING','UNCERTAIN','CONFIRMED',
      'REJECTED','FAILED','NOT_SUBMITTED','RECONCILIATION_REQUIRED','DEAD_LETTER'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pos_square_refund_audit_events (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT NOT NULL,
  intent_id BIGINT NOT NULL,
  refund_request_id BIGINT NOT NULL,
  actor_user_id BIGINT NULL,
  actor_type VARCHAR(24) NOT NULL,
  event_type VARCHAR(80) NOT NULL,
  status VARCHAR(32) NOT NULL,
  reason VARCHAR(500) NULL,
  record_version BIGINT NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  KEY ix_square_refund_audit_intent (company_id, intent_id, created_at),
  CONSTRAINT fk_square_refund_audit_company FOREIGN KEY (company_id)
    REFERENCES companies(id) ON DELETE RESTRICT,
  CONSTRAINT fk_square_refund_audit_intent FOREIGN KEY (company_id, intent_id)
    REFERENCES pos_square_terminal_payment_intents(company_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_square_refund_audit_request FOREIGN KEY (refund_request_id)
    REFERENCES pos_square_refund_requests(id) ON DELETE RESTRICT,
  CONSTRAINT fk_square_refund_audit_actor FOREIGN KEY (actor_user_id)
    REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT ck_square_refund_audit_actor CHECK
    (actor_type IN ('USER','WEBHOOK','SCHEDULED','SYSTEM'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE pos_terminal_payment_reversals
  MODIFY COLUMN intent_id BIGINT NULL,
  ADD COLUMN square_intent_id BIGINT NULL AFTER intent_id,
  ADD KEY ix_terminal_reversal_square_intent (company_id, square_intent_id),
  ADD CONSTRAINT fk_terminal_reversal_mp_intent FOREIGN KEY (company_id, intent_id)
    REFERENCES pos_mercado_pago_payment_intents(company_id, id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_terminal_reversal_square_intent FOREIGN KEY (company_id, square_intent_id)
    REFERENCES pos_square_terminal_payment_intents(company_id, id) ON DELETE RESTRICT,
  ADD CONSTRAINT ck_terminal_reversal_provider_intent CHECK
    ((provider_code='MERCADO_PAGO' AND intent_id IS NOT NULL AND square_intent_id IS NULL)
      OR (provider_code='SQUARE' AND intent_id IS NULL AND square_intent_id IS NOT NULL));

ALTER TABLE pos_terminal_refund_adjustments
  DROP FOREIGN KEY fk_terminal_refund_adjustment_intent,
  MODIFY COLUMN intent_id BIGINT NULL,
  ADD COLUMN square_intent_id BIGINT NULL AFTER intent_id,
  ADD KEY ix_terminal_adjustment_square_intent (company_id, square_intent_id),
  ADD CONSTRAINT fk_terminal_adjustment_mp_intent FOREIGN KEY (company_id, intent_id)
    REFERENCES pos_mercado_pago_payment_intents(company_id, id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_terminal_adjustment_square_intent FOREIGN KEY (company_id, square_intent_id)
    REFERENCES pos_square_terminal_payment_intents(company_id, id) ON DELETE RESTRICT,
  ADD CONSTRAINT ck_terminal_adjustment_provider_intent CHECK
    ((provider_code='MERCADO_PAGO' AND intent_id IS NOT NULL AND square_intent_id IS NULL)
      OR (provider_code='SQUARE' AND intent_id IS NULL AND square_intent_id IS NOT NULL));
