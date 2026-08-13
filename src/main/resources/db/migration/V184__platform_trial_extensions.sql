-- Auditable and idempotent Root-managed trial extensions.

CREATE TABLE platform_trial_extensions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    public_reference CHAR(32) NOT NULL,
    company_id BIGINT NOT NULL,
    actor_user_id BIGINT NOT NULL,
    idempotency_key_hash CHAR(64) NOT NULL,
    source_type VARCHAR(24) NOT NULL,
    source_record_id BIGINT NULL,
    stripe_subscription_id VARCHAR(255) NULL,
    added_days INT NOT NULL,
    prior_ends_at TIMESTAMP(6) NOT NULL,
    extended_ends_at TIMESTAMP(6) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'PREPARED',
    failure_code VARCHAR(80) NULL,
    failure_message VARCHAR(500) NULL,
    completed_at TIMESTAMP(6) NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_platform_trial_extensions_reference (public_reference),
    UNIQUE KEY uq_platform_trial_extensions_idempotency (idempotency_key_hash),
    KEY idx_platform_trial_extensions_company (company_id, created_at),
    KEY idx_platform_trial_extensions_recovery (status, updated_at),
    CONSTRAINT fk_platform_trial_extensions_company
        FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT fk_platform_trial_extensions_actor
        FOREIGN KEY (actor_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT chk_platform_trial_extensions_days
        CHECK (added_days IN (7, 15, 30)),
    CONSTRAINT chk_platform_trial_extensions_source
        CHECK (source_type IN ('STRIPE', 'LOCAL_DEMO'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
