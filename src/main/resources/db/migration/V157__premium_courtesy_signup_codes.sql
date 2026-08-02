-- Root-managed courtesy signup channel. Codes are stored only as SHA-256 hashes;
-- the clear value is returned once to the platform administrator who creates it.

CREATE TABLE billing_courtesy_codes (
    id BIGINT NOT NULL AUTO_INCREMENT,
    public_reference CHAR(32) NOT NULL,
    code_hash CHAR(64) NOT NULL,
    label VARCHAR(120) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    allowed_email VARCHAR(190) NULL,
    all_basic_products TINYINT(1) NOT NULL DEFAULT 1,
    product_codes_csv VARCHAR(1000) NULL,
    included_extra_seats INT NOT NULL DEFAULT 0,
    access_days INT NULL,
    max_redemptions INT NOT NULL DEFAULT 1,
    redemption_count INT NOT NULL DEFAULT 0,
    starts_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    expires_at TIMESTAMP(6) NULL,
    reason VARCHAR(500) NOT NULL,
    campaign_code VARCHAR(80) NULL,
    idempotency_key_hash CHAR(64) NOT NULL,
    created_by_user_id BIGINT NOT NULL,
    revoked_by_user_id BIGINT NULL,
    revoked_at TIMESTAMP(6) NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_billing_courtesy_codes_reference (public_reference),
    UNIQUE KEY uq_billing_courtesy_codes_hash (code_hash),
    UNIQUE KEY uq_billing_courtesy_codes_idempotency (idempotency_key_hash),
    KEY idx_billing_courtesy_codes_active (status, starts_at, expires_at),
    KEY idx_billing_courtesy_codes_email (allowed_email),
    CONSTRAINT fk_billing_courtesy_codes_created_by
        FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT fk_billing_courtesy_codes_revoked_by
        FOREIGN KEY (revoked_by_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE billing_signup_intents
    ADD COLUMN signup_channel VARCHAR(20) NOT NULL DEFAULT 'STRIPE' AFTER status,
    ADD COLUMN courtesy_code_id BIGINT NULL AFTER signup_channel,
    ADD COLUMN courtesy_access_ends_at TIMESTAMP(6) NULL AFTER courtesy_code_id,
    ADD COLUMN courtesy_permanent TINYINT(1) NOT NULL DEFAULT 0 AFTER courtesy_access_ends_at,
    ADD KEY idx_billing_signup_intents_courtesy (courtesy_code_id, status),
    ADD CONSTRAINT fk_billing_signup_intents_courtesy
        FOREIGN KEY (courtesy_code_id) REFERENCES billing_courtesy_codes (id) ON DELETE SET NULL;

CREATE TABLE billing_courtesy_redemptions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    courtesy_code_id BIGINT NOT NULL,
    signup_intent_id BIGINT NOT NULL,
    company_id BIGINT NULL,
    email_normalized VARCHAR(190) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'REDEEMED',
    redeemed_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    provisioned_at TIMESTAMP(6) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_billing_courtesy_redemptions_intent (signup_intent_id),
    KEY idx_billing_courtesy_redemptions_code (courtesy_code_id, redeemed_at),
    KEY idx_billing_courtesy_redemptions_company (company_id),
    CONSTRAINT fk_billing_courtesy_redemptions_code
        FOREIGN KEY (courtesy_code_id) REFERENCES billing_courtesy_codes (id) ON DELETE RESTRICT,
    CONSTRAINT fk_billing_courtesy_redemptions_intent
        FOREIGN KEY (signup_intent_id) REFERENCES billing_signup_intents (id) ON DELETE CASCADE,
    CONSTRAINT fk_billing_courtesy_redemptions_company
        FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
