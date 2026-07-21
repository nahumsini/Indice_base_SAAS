-- Premium multitenant phase 7: company-level storage metering and quotas.
--
-- The ledger is created for premium-enrolled companies only. Historical tenants
-- remain unmetered until they cross the explicit enrollment boundary.

CREATE TABLE company_storage_objects (
    id BIGINT NOT NULL AUTO_INCREMENT,
    company_id BIGINT NOT NULL,
    owner_module VARCHAR(80) NOT NULL,
    bucket_name VARCHAR(255) NOT NULL,
    object_key VARCHAR(700) NOT NULL,
    declared_size_bytes BIGINT NOT NULL,
    actual_size_bytes BIGINT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'RESERVED',
    idempotency_key_hash CHAR(64) NOT NULL,
    expires_at TIMESTAMP(6) NULL,
    committed_at TIMESTAMP(6) NULL,
    released_at TIMESTAMP(6) NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_company_storage_objects_key (company_id, object_key),
    UNIQUE KEY uq_company_storage_objects_idempotency (idempotency_key_hash),
    KEY idx_company_storage_objects_expiry (status, expires_at),
    KEY idx_company_storage_objects_company_status (company_id, status),
    CONSTRAINT fk_company_storage_objects_company
        FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT chk_company_storage_objects_status
        CHECK (status IN ('RESERVED', 'COMMITTED', 'RELEASED', 'EXPIRED')),
    CONSTRAINT chk_company_storage_objects_sizes
        CHECK (declared_size_bytes >= 0 AND (actual_size_bytes IS NULL OR actual_size_bytes >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE company_storage_states (
    company_id BIGINT NOT NULL,
    included_bytes BIGINT NOT NULL DEFAULT 5368709120,
    purchased_blocks INT NOT NULL DEFAULT 0,
    used_bytes BIGINT NOT NULL DEFAULT 0,
    reserved_bytes BIGINT NOT NULL DEFAULT 0,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (company_id),
    CONSTRAINT fk_company_storage_states_company
        FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT chk_company_storage_states_nonnegative
        CHECK (included_bytes >= 0 AND purchased_blocks >= 0 AND used_bytes >= 0 AND reserved_bytes >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE company_storage_events (
    id BIGINT NOT NULL AUTO_INCREMENT,
    public_reference CHAR(32) NOT NULL,
    company_id BIGINT NOT NULL,
    storage_object_id BIGINT NULL,
    event_type VARCHAR(40) NOT NULL,
    bytes_delta BIGINT NOT NULL DEFAULT 0,
    detail_json JSON NULL,
    occurred_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_company_storage_events_public (public_reference),
    KEY idx_company_storage_events_company (company_id, occurred_at),
    CONSTRAINT fk_company_storage_events_company
        FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT fk_company_storage_events_object
        FOREIGN KEY (storage_object_id) REFERENCES company_storage_objects (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE company_storage_mutations (
    id BIGINT NOT NULL AUTO_INCREMENT,
    public_reference CHAR(32) NOT NULL,
    company_id BIGINT NOT NULL,
    idempotency_key_hash CHAR(64) NOT NULL,
    request_fingerprint CHAR(64) NOT NULL,
    prior_blocks INT NOT NULL,
    target_blocks INT NOT NULL,
    status VARCHAR(20) NOT NULL,
    stripe_subscription_id VARCHAR(255) NOT NULL,
    stripe_subscription_item_id VARCHAR(255) NULL,
    actor_user_id BIGINT NOT NULL,
    failure_code VARCHAR(120) NULL,
    failure_message VARCHAR(500) NULL,
    completed_at TIMESTAMP(6) NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_company_storage_mutations_public (public_reference),
    UNIQUE KEY uq_company_storage_mutations_idempotency (idempotency_key_hash),
    KEY idx_company_storage_mutations_company (company_id, created_at),
    CONSTRAINT fk_company_storage_mutations_company
        FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT fk_company_storage_mutations_actor
        FOREIGN KEY (actor_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT chk_company_storage_mutations_status
        CHECK (status IN ('PROCESSING', 'COMPLETED', 'FAILED')),
    CONSTRAINT chk_company_storage_mutations_blocks
        CHECK (prior_blocks >= 0 AND target_blocks >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE company_billing_subscriptions
    ADD COLUMN stripe_storage_item_id VARCHAR(255) NULL AFTER stripe_extra_seat_item_id;

-- Seed persistent objects already known to the application. UNION + GROUP BY
-- prevents a petty-cash receipt promoted to an expense from being counted twice.
INSERT INTO company_storage_objects (
    company_id, owner_module, bucket_name, object_key, declared_size_bytes,
    actual_size_bytes, status, idempotency_key_hash, committed_at, expires_at
)
SELECT existing.company_id,
       'LEGACY',
       'LEGACY',
       existing.object_key,
       MAX(existing.size_bytes),
       MAX(existing.size_bytes),
       'COMMITTED',
       SHA2(CONCAT('storage-legacy:', existing.company_id, ':', existing.object_key), 256),
       CURRENT_TIMESTAMP(6),
       NULL
FROM (
    SELECT company_id, object_key, size_bytes FROM user_documents WHERE LOWER(status) = 'active' AND object_key IS NOT NULL AND object_key <> ''
    UNION ALL
    SELECT company_id, object_key, size_bytes FROM user_record_attachments WHERE deleted_at IS NULL AND object_key IS NOT NULL AND object_key <> ''
    UNION ALL
    SELECT company_id, object_key, size_bytes FROM process_task_attachments WHERE deleted_at IS NULL AND object_key IS NOT NULL AND object_key <> ''
    UNION ALL
    SELECT company_id, object_key, size_bytes FROM finance_expense_attachments WHERE deleted_at IS NULL AND object_key IS NOT NULL AND object_key <> ''
    UNION ALL
    SELECT company_id, object_key, size_bytes FROM finance_budget_line_attachments WHERE deleted_at IS NULL AND object_key IS NOT NULL AND object_key <> ''
    UNION ALL
    SELECT company_id, object_key, size_bytes FROM finance_petty_cash_settlement_line_attachments WHERE deleted_at IS NULL AND object_key IS NOT NULL AND object_key <> ''
    UNION ALL
    SELECT company_id, object_key, size_bytes FROM user_permission_attachments WHERE deleted_at IS NULL AND object_key IS NOT NULL AND object_key <> ''
    UNION ALL
    SELECT company_id, object_key, size_bytes FROM hr_announcement_attachments WHERE deleted_at IS NULL AND object_key IS NOT NULL AND object_key <> ''
    UNION ALL
    SELECT company_id,
           object_key,
           CAST(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(metadata_json, '$.sizeBytes')), '0') AS UNSIGNED)
      FROM sales_files
     WHERE deleted_at IS NULL
       AND object_key IS NOT NULL AND object_key <> ''
       AND JSON_VALID(metadata_json)
       AND CAST(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(metadata_json, '$.sizeBytes')), '0') AS UNSIGNED) > 0
) existing
JOIN company_entitlement_policies policy ON policy.company_id = existing.company_id
GROUP BY existing.company_id, existing.object_key;

INSERT INTO company_storage_states (
    company_id, included_bytes, purchased_blocks, used_bytes, reserved_bytes
)
SELECT policy.company_id,
       5368709120,
       0,
       COALESCE(SUM(object.actual_size_bytes), 0),
       0
FROM company_entitlement_policies policy
LEFT JOIN company_storage_objects object
  ON object.company_id = policy.company_id AND object.status = 'COMMITTED'
GROUP BY policy.company_id;
