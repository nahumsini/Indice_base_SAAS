CREATE TABLE pos_mercado_pago_connections (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT NOT NULL,
  seller_id VARCHAR(32) NOT NULL,
  environment VARCHAR(16) NOT NULL,
  state VARCHAR(32) NOT NULL DEFAULT 'CONNECTED',
  country_code VARCHAR(2) NOT NULL,
  site_id VARCHAR(8) NOT NULL,
  live_mode BOOLEAN NOT NULL,
  access_token_ciphertext TEXT NOT NULL,
  refresh_token_ciphertext TEXT NOT NULL,
  expires_at DATETIME(6) NOT NULL,
  scopes VARCHAR(255) NOT NULL,
  version BIGINT NOT NULL DEFAULT 0,
  refresh_lease_id VARCHAR(36) NULL,
  refresh_lease_until DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY uk_mp_connection_company_env (company_id, environment),
  UNIQUE KEY uk_mp_connection_seller (environment, seller_id),
  UNIQUE KEY uk_mp_connection_owner (company_id, id),
  CONSTRAINT fk_mp_connection_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT,
  CONSTRAINT ck_mp_connection_environment CHECK (environment IN ('sandbox','production')),
  CONSTRAINT ck_mp_connection_country CHECK (country_code='MX' AND site_id='MLM')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pos_mercado_pago_oauth_states (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT NOT NULL,
  actor_user_id BIGINT NOT NULL,
  state_hash CHAR(64) NOT NULL,
  environment VARCHAR(16) NOT NULL,
  verifier_ciphertext TEXT NOT NULL,
  expires_at DATETIME(6) NOT NULL,
  consumed_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY uk_mp_oauth_state_hash (state_hash),
  KEY ix_mp_oauth_owner_expiry (company_id, actor_user_id, expires_at),
  CONSTRAINT fk_mp_oauth_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT,
  CONSTRAINT fk_mp_oauth_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pos_mercado_pago_terminals (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT NOT NULL,
  connection_id BIGINT NOT NULL,
  provider_terminal_id VARCHAR(128) NOT NULL,
  store_id VARCHAR(128) NULL,
  pos_id VARCHAR(128) NULL,
  name VARCHAR(180) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'CONFIGURATION_REQUIRED',
  operating_mode VARCHAR(24) NOT NULL DEFAULT 'STANDALONE',
  cash_register_id BIGINT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY uk_mp_terminal_owned_provider (company_id, connection_id, provider_terminal_id),
  UNIQUE KEY uk_mp_terminal_register (company_id, cash_register_id),
  UNIQUE KEY uk_mp_terminal_owner (company_id, id),
  CONSTRAINT fk_mp_terminal_connection FOREIGN KEY (company_id, connection_id)
    REFERENCES pos_mercado_pago_connections(company_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_mp_terminal_register FOREIGN KEY (cash_register_id)
    REFERENCES pos_cash_registers(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pos_mercado_pago_payment_intents (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT NOT NULL,
  cash_register_id BIGINT NOT NULL,
  shift_id BIGINT NOT NULL,
  terminal_id BIGINT NOT NULL,
  connection_id BIGINT NOT NULL,
  provider_terminal_id VARCHAR(128) NOT NULL,
  seller_id VARCHAR(32) NOT NULL,
  environment VARCHAR(16) NOT NULL,
  idempotency_key VARCHAR(64) NOT NULL,
  external_reference VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'WAITING',
  amount DECIMAL(19,4) NOT NULL,
  currency_code VARCHAR(3) NOT NULL,
  payload_hash CHAR(64) NOT NULL,
  checkout_json JSON NOT NULL,
  provider_request_json JSON NOT NULL,
  order_id VARCHAR(128) NULL,
  payment_id VARCHAR(128) NULL,
  provider_state VARCHAR(32) NULL,
  verified_evidence_json JSON NULL,
  refund_pending BOOLEAN NOT NULL DEFAULT FALSE,
  message VARCHAR(500) NULL,
  pos_ticket_id BIGINT NULL,
  created_by_user_id BIGINT NOT NULL,
  created_by_role VARCHAR(40) NOT NULL,
  scope_type VARCHAR(40) NOT NULL,
  scope_unit_id BIGINT NULL,
  scope_business_id BIGINT NULL,
  version BIGINT NOT NULL DEFAULT 0,
  dispatched_at DATETIME(6) NULL,
  dispatch_lease_id VARCHAR(36) NULL,
  dispatch_lease_until DATETIME(6) NULL,
  reconcile_lease_id VARCHAR(36) NULL,
  reconcile_lease_until DATETIME(6) NULL,
  next_reconcile_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  expires_at DATETIME(6) NOT NULL,
  active_register_id BIGINT GENERATED ALWAYS AS
    (CASE WHEN status IN ('WAITING','UNCERTAIN','APPROVED','PARTIALLY_REFUNDED')
      AND pos_ticket_id IS NULL THEN cash_register_id ELSE NULL END) STORED,
  active_terminal_id BIGINT GENERATED ALWAYS AS
    (CASE WHEN status IN ('WAITING','UNCERTAIN','APPROVED','PARTIALLY_REFUNDED')
      AND pos_ticket_id IS NULL THEN terminal_id ELSE NULL END) STORED,
  UNIQUE KEY uk_mp_intent_key (company_id, idempotency_key),
  UNIQUE KEY uk_mp_intent_reference (environment, external_reference),
  UNIQUE KEY uk_mp_intent_order (environment, order_id),
  UNIQUE KEY uk_mp_intent_payment (environment, payment_id),
  UNIQUE KEY uk_mp_intent_register (company_id, active_register_id),
  UNIQUE KEY uk_mp_intent_terminal (company_id, active_terminal_id),
  UNIQUE KEY uk_mp_intent_owner (company_id, id),
  KEY ix_mp_intent_recovery (next_reconcile_at, status),
  KEY ix_mp_intent_register_shift (company_id, cash_register_id, shift_id),
  CONSTRAINT fk_mp_intent_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT,
  CONSTRAINT fk_mp_intent_terminal FOREIGN KEY (company_id, terminal_id)
    REFERENCES pos_mercado_pago_terminals(company_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_mp_intent_connection FOREIGN KEY (company_id, connection_id)
    REFERENCES pos_mercado_pago_connections(company_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_mp_intent_shift FOREIGN KEY (shift_id) REFERENCES pos_shifts(id) ON DELETE RESTRICT,
  CONSTRAINT fk_mp_intent_register FOREIGN KEY (cash_register_id) REFERENCES pos_cash_registers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_mp_intent_ticket FOREIGN KEY (pos_ticket_id) REFERENCES pos_tickets(id) ON DELETE RESTRICT,
  CONSTRAINT fk_mp_intent_actor FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT ck_mp_intent_money CHECK (amount>0 AND currency_code='MXN'),
  CONSTRAINT ck_mp_intent_status CHECK
    (status IN ('WAITING','UNCERTAIN','APPROVED','DECLINED','CANCELLED','EXPIRED','PARTIALLY_REFUNDED','REFUNDED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pos_mercado_pago_webhook_inbox (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  environment VARCHAR(16) NOT NULL,
  order_id VARCHAR(128) NOT NULL,
  delivery_hash CHAR(64) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'RECEIVED',
  attempts INT NOT NULL DEFAULT 0,
  duplicate_count INT NOT NULL DEFAULT 0,
  company_id BIGINT NULL,
  intent_id BIGINT NULL,
  lease_id VARCHAR(36) NULL,
  lease_until DATETIME(6) NULL,
  next_attempt_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  received_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  processed_at DATETIME(6) NULL,
  error_code VARCHAR(80) NULL,
  UNIQUE KEY uk_mp_webhook_delivery (environment, delivery_hash),
  KEY ix_mp_webhook_work (status, next_attempt_at),
  KEY ix_mp_webhook_link (environment, order_id),
  CONSTRAINT fk_mp_webhook_intent FOREIGN KEY (company_id, intent_id)
    REFERENCES pos_mercado_pago_payment_intents(company_id, id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pos_mercado_pago_payment_admissions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    company_id BIGINT NOT NULL,
    idempotency_key VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    cash_register_id BIGINT NOT NULL,
    created_by_user_id BIGINT NOT NULL,
    unit_id BIGINT NULL,
    business_id BIGINT NULL,
    scope_type VARCHAR(32) NOT NULL,
    scope_unit_id BIGINT NULL,
    scope_business_id BIGINT NULL,
    payload_hash CHAR(64) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'RESERVED',
    reason VARCHAR(64) NULL,
    message VARCHAR(500) NULL,
    status_code INT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uk_mp_admission_key (company_id,idempotency_key),
    KEY ix_mp_admission_actor (company_id,created_by_user_id,created_at),
    CONSTRAINT fk_mp_admission_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT,
    CONSTRAINT fk_mp_admission_register FOREIGN KEY (cash_register_id) REFERENCES pos_cash_registers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_mp_admission_actor FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT ck_mp_admission_status CHECK (status IN ('RESERVED','REJECTED'))
);

CREATE TABLE pos_mercado_pago_refund_requests (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT NOT NULL,
  intent_id BIGINT NOT NULL,
  request_key VARCHAR(64) NOT NULL,
  amount DECIMAL(19,4) NOT NULL,
  baseline_amount DECIMAL(19,4) NOT NULL,
  request_json JSON NOT NULL,
  payload_hash CHAR(64) NOT NULL,
  reason VARCHAR(500) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'WAITING',
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  active_intent_id BIGINT GENERATED ALWAYS AS
    (CASE WHEN status IN ('WAITING','SUBMITTING','PENDING','UNCERTAIN') THEN intent_id ELSE NULL END) STORED,
  UNIQUE KEY uk_mp_refund_key (company_id, request_key),
  UNIQUE KEY uk_mp_refund_active_intent (company_id, active_intent_id),
  CONSTRAINT fk_mp_refund_intent FOREIGN KEY (company_id, intent_id)
    REFERENCES pos_mercado_pago_payment_intents(company_id, id) ON DELETE RESTRICT,
  CONSTRAINT ck_mp_refund_amount CHECK (amount>0 AND baseline_amount>=0),
  CONSTRAINT ck_mp_refund_status CHECK
    (status IN ('WAITING','SUBMITTING','PENDING','UNCERTAIN','CONFIRMED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pos_terminal_payment_reversals (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT NOT NULL,
  provider_code VARCHAR(24) NOT NULL,
  intent_id BIGINT NOT NULL,
  pos_ticket_id BIGINT NULL,
  payment_id VARCHAR(128) NOT NULL,
  shift_id BIGINT NOT NULL,
  amount DECIMAL(19,4) NOT NULL,
  cumulative_amount DECIMAL(19,4) NOT NULL,
  currency_code VARCHAR(3) NOT NULL,
  provider_refund_id VARCHAR(128) NOT NULL,
  accounting_state VARCHAR(32) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY uk_terminal_reversal_provider_refund (company_id, provider_code, provider_refund_id),
  KEY ix_terminal_reversal_shift (company_id, shift_id, pos_ticket_id),
  CONSTRAINT fk_terminal_reversal_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT,
  CONSTRAINT fk_terminal_reversal_ticket FOREIGN KEY (pos_ticket_id) REFERENCES pos_tickets(id) ON DELETE RESTRICT,
  CONSTRAINT fk_terminal_reversal_shift FOREIGN KEY (shift_id) REFERENCES pos_shifts(id) ON DELETE RESTRICT,
  CONSTRAINT ck_terminal_reversal_amount CHECK (amount>0 AND cumulative_amount>=amount)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pos_mercado_pago_audit_events (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT NOT NULL,
  intent_id BIGINT NULL,
  actor_user_id BIGINT NULL,
  event_type VARCHAR(80) NOT NULL,
  status VARCHAR(32) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  KEY ix_mp_audit_company_time (company_id, created_at),
  KEY ix_mp_audit_intent (company_id, intent_id, created_at),
  CONSTRAINT fk_mp_audit_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT,
  CONSTRAINT fk_mp_audit_intent FOREIGN KEY (company_id, intent_id)
    REFERENCES pos_mercado_pago_payment_intents(company_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_mp_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
