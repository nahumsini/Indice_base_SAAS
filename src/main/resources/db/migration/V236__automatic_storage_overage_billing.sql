-- Storage never interrupts a tenant upload. Crossing the included allowance
-- expands local capacity immediately and queues the matching Stripe quantity
-- for the next invoice. The row is a durable retryable outbox per company.

CREATE TABLE company_storage_overage_syncs (
    company_id BIGINT NOT NULL,
    public_reference CHAR(32) NOT NULL,
    target_blocks INT NOT NULL,
    synced_blocks INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    attempt_count INT NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    stripe_subscription_id VARCHAR(255) NULL,
    stripe_subscription_item_id VARCHAR(255) NULL,
    last_error_code VARCHAR(120) NULL,
    last_error_message VARCHAR(500) NULL,
    completed_at TIMESTAMP(6) NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (company_id),
    UNIQUE KEY uq_company_storage_overage_sync_reference (public_reference),
    KEY idx_company_storage_overage_sync_dispatch (status, next_attempt_at),
    CONSTRAINT fk_company_storage_overage_sync_company
        FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT chk_company_storage_overage_sync_status
        CHECK (status IN ('PENDING', 'PROCESSING', 'SYNCED', 'FAILED')),
    CONSTRAINT chk_company_storage_overage_sync_blocks
        CHECK (target_blocks >= 0 AND synced_blocks >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
