ALTER TABLE pos_mercado_pago_payment_intents
  DROP INDEX uk_mp_intent_register,
  DROP INDEX uk_mp_intent_terminal,
  DROP CHECK ck_mp_intent_status,
  MODIFY COLUMN active_register_id BIGINT GENERATED ALWAYS AS
    (CASE WHEN status IN ('WAITING','UNCERTAIN','APPROVED','PARTIALLY_REFUNDED',
      'RECONCILIATION_REQUIRED') AND pos_ticket_id IS NULL THEN cash_register_id ELSE NULL END) STORED,
  MODIFY COLUMN active_terminal_id BIGINT GENERATED ALWAYS AS
    (CASE WHEN status IN ('WAITING','UNCERTAIN','APPROVED','PARTIALLY_REFUNDED',
      'RECONCILIATION_REQUIRED') AND pos_ticket_id IS NULL THEN terminal_id ELSE NULL END) STORED,
  ADD UNIQUE KEY uk_mp_intent_register (company_id, active_register_id),
  ADD UNIQUE KEY uk_mp_intent_terminal (company_id, active_terminal_id),
  ADD CONSTRAINT ck_mp_intent_status CHECK
    (status IN ('WAITING','UNCERTAIN','APPROVED','DECLINED','CANCELLED','EXPIRED',
      'PARTIALLY_REFUNDED','REFUNDED','RECONCILIATION_REQUIRED'));

ALTER TABLE pos_mercado_pago_refund_requests
  DROP INDEX uk_mp_refund_active_intent,
  DROP CHECK ck_mp_refund_status,
  MODIFY COLUMN status VARCHAR(32) NOT NULL DEFAULT 'WAITING',
  ADD COLUMN requested_by_user_id BIGINT NULL AFTER reason,
  ADD COLUMN requested_by_role VARCHAR(40) NULL AFTER requested_by_user_id,
  ADD COLUMN requested_scope_type VARCHAR(40) NULL AFTER requested_by_role,
  ADD COLUMN requested_scope_unit_id BIGINT NULL AFTER requested_scope_type,
  ADD COLUMN requested_scope_business_id BIGINT NULL AFTER requested_scope_unit_id,
  ADD COLUMN work_lease_id VARCHAR(36) NULL AFTER status,
  ADD COLUMN work_lease_until DATETIME(6) NULL AFTER work_lease_id,
  ADD COLUMN submission_attempts INT NOT NULL DEFAULT 0 AFTER work_lease_until,
  ADD COLUMN recovery_attempts INT NOT NULL DEFAULT 0 AFTER submission_attempts,
  ADD COLUMN next_attempt_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) AFTER recovery_attempts,
  ADD COLUMN last_error_code VARCHAR(80) NULL AFTER next_attempt_at,
  ADD COLUMN last_provider_check_at DATETIME(6) NULL AFTER last_error_code,
  ADD COLUMN dead_lettered_at DATETIME(6) NULL AFTER last_provider_check_at,
  ADD COLUMN version BIGINT NOT NULL DEFAULT 0 AFTER dead_lettered_at,
  MODIFY COLUMN active_intent_id BIGINT GENERATED ALWAYS AS
    (CASE WHEN status IN ('WAITING','SUBMITTING','PENDING','UNCERTAIN',
      'RECONCILIATION_REQUIRED','DEAD_LETTER') THEN intent_id ELSE NULL END) STORED,
  ADD UNIQUE KEY uk_mp_refund_active_intent (company_id, active_intent_id),
  ADD KEY ix_mp_refund_recovery (status, next_attempt_at, work_lease_until),
  ADD CONSTRAINT fk_mp_refund_requester FOREIGN KEY (requested_by_user_id)
    REFERENCES users(id) ON DELETE RESTRICT,
  ADD CONSTRAINT ck_mp_refund_status CHECK
    (status IN ('WAITING','SUBMITTING','PENDING','UNCERTAIN','CONFIRMED',
      'REJECTED','NOT_SUBMITTED','RECONCILIATION_REQUIRED','DEAD_LETTER'));

ALTER TABLE pos_mercado_pago_audit_events
  ADD COLUMN actor_type VARCHAR(24) NULL AFTER actor_user_id,
  ADD COLUMN reason VARCHAR(500) NULL AFTER status,
  ADD COLUMN record_version BIGINT NULL AFTER reason;

UPDATE pos_mercado_pago_audit_events
SET actor_type=CASE WHEN actor_user_id IS NULL THEN 'SYSTEM' ELSE 'USER' END
WHERE actor_type IS NULL;

ALTER TABLE pos_mercado_pago_audit_events
  MODIFY COLUMN actor_type VARCHAR(24) NOT NULL,
  ADD CONSTRAINT ck_mp_audit_actor_type CHECK
    (actor_type IN ('USER','WEBHOOK','SCHEDULED','SYSTEM'));
