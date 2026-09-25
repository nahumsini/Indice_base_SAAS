SET @square_duplicate_merchants = (
  SELECT COUNT(*) FROM (
    SELECT environment, merchant_id
    FROM pos_square_connections
    GROUP BY environment, merchant_id
    HAVING COUNT(DISTINCT company_id) > 1
  ) duplicate_square_merchants
);
SET @square_merchant_guard_sql = IF(
  @square_duplicate_merchants = 0,
  'SELECT 1',
  'SIGNAL SQLSTATE ''45000'' SET MESSAGE_TEXT = ''V280 blocked: one Square merchant is owned by multiple companies'''
);
PREPARE square_merchant_guard_stmt FROM @square_merchant_guard_sql;
EXECUTE square_merchant_guard_stmt;
DEALLOCATE PREPARE square_merchant_guard_stmt;

ALTER TABLE pos_square_connections
  ADD COLUMN token_version BIGINT NOT NULL DEFAULT 0 AFTER token_expires_at,
  ADD COLUMN refresh_lease_owner VARCHAR(36) NULL AFTER token_version,
  ADD COLUMN refresh_lease_until DATETIME(6) NULL AFTER refresh_lease_owner,
  ADD COLUMN live_activation_state VARCHAR(16) NOT NULL DEFAULT 'DISABLED' AFTER refresh_lease_until,
  ADD COLUMN live_activation_actor_user_id BIGINT NULL AFTER live_activation_state,
  ADD COLUMN live_activation_reason VARCHAR(500) NULL AFTER live_activation_actor_user_id,
  ADD COLUMN live_activation_changed_at DATETIME(6) NULL AFTER live_activation_reason,
  ADD COLUMN live_activated_at DATETIME(6) NULL AFTER live_activation_changed_at,
  ADD COLUMN live_suspended_at DATETIME(6) NULL AFTER live_activated_at,
  ADD COLUMN live_activation_version BIGINT NOT NULL DEFAULT 0 AFTER live_suspended_at,
  ADD UNIQUE KEY uk_pos_square_connections_merchant (environment, merchant_id),
  ADD KEY ix_pos_square_refresh_lease (refresh_lease_until),
  ADD KEY ix_pos_square_activation (environment, live_activation_state, company_id),
  ADD CONSTRAINT fk_pos_square_activation_actor FOREIGN KEY (live_activation_actor_user_id)
    REFERENCES users(id) ON DELETE RESTRICT,
  ADD CONSTRAINT chk_pos_square_activation_state
    CHECK (live_activation_state IN ('DISABLED','PILOT','ACTIVE','SUSPENDED'));

ALTER TABLE pos_square_terminals
  ADD COLUMN provider_verified_at DATETIME(6) NULL AFTER pair_by,
  ADD COLUMN verification_status VARCHAR(24) NOT NULL DEFAULT 'STALE' AFTER provider_verified_at,
  ADD COLUMN version BIGINT NOT NULL DEFAULT 0 AFTER verification_status,
  ADD KEY ix_pos_square_terminal_verification (company_id, verification_status, provider_verified_at),
  ADD CONSTRAINT chk_pos_square_terminal_verification
    CHECK (verification_status IN ('READY','STALE','UNAVAILABLE'));

ALTER TABLE pos_square_terminal_payment_intents
  ADD COLUMN submission_started_at DATETIME(6) NULL AFTER square_request_json,
  ADD COLUMN submission_attempts INT NOT NULL DEFAULT 0 AFTER submission_started_at;

ALTER TABLE pos_square_webhook_events
  DROP CHECK chk_pos_square_webhook_status,
  ADD COLUMN attempt_count INT NOT NULL DEFAULT 0 AFTER duplicate_count,
  ADD COLUMN lifetime_attempt_count INT NOT NULL DEFAULT 0 AFTER attempt_count,
  ADD COLUMN replay_count INT NOT NULL DEFAULT 0 AFTER lifetime_attempt_count,
  ADD COLUMN next_attempt_at DATETIME(6) NULL AFTER replay_count,
  ADD COLUMN lease_owner VARCHAR(36) NULL AFTER next_attempt_at,
  ADD COLUMN lease_expires_at DATETIME(6) NULL AFTER lease_owner,
  ADD COLUMN dead_lettered_at DATETIME(6) NULL AFTER lease_expires_at,
  ADD KEY ix_pos_square_webhook_retry (environment, status, next_attempt_at, lease_expires_at),
  ADD CONSTRAINT chk_pos_square_webhook_status CHECK
    (status IN ('RECEIVED','PROCESSING','PROCESSED','IGNORED','FAILED','DEAD_LETTER'));

CREATE TABLE pos_square_webhook_rate_limits (
  peer_hash CHAR(64) NOT NULL,
  window_started_at DATETIME(6) NOT NULL,
  request_count INT NOT NULL DEFAULT 1,
  PRIMARY KEY (peer_hash, window_started_at),
  KEY ix_pos_square_webhook_rate_limit_cleanup (window_started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pos_square_webhook_replay_events (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT NOT NULL,
  webhook_event_id BIGINT NOT NULL,
  replay_number INT NOT NULL,
  actor_user_id BIGINT NOT NULL,
  reason VARCHAR(500) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY uk_pos_square_webhook_replay (webhook_event_id, replay_number),
  KEY ix_pos_square_webhook_replay_company (company_id, created_at),
  CONSTRAINT fk_pos_square_webhook_replay_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT,
  CONSTRAINT fk_pos_square_webhook_replay_event FOREIGN KEY (webhook_event_id) REFERENCES pos_square_webhook_events(id) ON DELETE RESTRICT,
  CONSTRAINT fk_pos_square_webhook_replay_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
