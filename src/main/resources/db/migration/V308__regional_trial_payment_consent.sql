-- Immutable advance payment evidence, separate from lead/trial acceptance.
CREATE TABLE billing_trial_payment_consents (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT NOT NULL,
    actor_user_id BIGINT NOT NULL,
    signup_intent_id BIGINT NOT NULL,
    quote_hash CHAR(64) NOT NULL,
    terms_version VARCHAR(64) NOT NULL,
    catalog_version_id BIGINT NOT NULL,
    catalog_product_id BIGINT NOT NULL,
    currency CHAR(3) NOT NULL,
    billing_interval VARCHAR(12) NOT NULL,
    amount_before_tax_cents BIGINT NOT NULL,
    included_seats INT NOT NULL,
    original_trial_ends_at DATETIME(6) NOT NULL,
    first_charge_at DATETIME(6) NOT NULL,
    charge_timing VARCHAR(16) NOT NULL,
    external_price_id VARCHAR(255) NOT NULL,
    stripe_mode VARCHAR(8) NOT NULL,
    stripe_account_id VARCHAR(255) NOT NULL,
    accepted_at DATETIME(6) NOT NULL,
    setup_verified_at DATETIME(6) NULL,
    paid_invoice_id VARCHAR(255) NULL,
    paid_at DATETIME(6) NULL,
    UNIQUE KEY uq_trial_consent_intent (signup_intent_id),
    UNIQUE KEY uq_trial_consent_invoice (paid_invoice_id),
    KEY idx_trial_consent_company (company_id, id),
    CONSTRAINT fk_trial_consent_company FOREIGN KEY (company_id) REFERENCES companies(id),
    CONSTRAINT fk_trial_consent_actor FOREIGN KEY (actor_user_id) REFERENCES users(id),
    CONSTRAINT fk_trial_consent_intent FOREIGN KEY (signup_intent_id) REFERENCES billing_signup_intents(id),
    CONSTRAINT fk_trial_consent_version FOREIGN KEY (catalog_version_id) REFERENCES billing_catalog_versions(id),
    CONSTRAINT fk_trial_consent_product FOREIGN KEY (catalog_product_id) REFERENCES billing_catalog_products(id),
    CONSTRAINT chk_trial_consent_amount CHECK (amount_before_tax_cents > 0 AND included_seats = 10),
    CONSTRAINT chk_trial_consent_currency CHECK (currency IN ('CAD', 'MXN')),
    CONSTRAINT chk_trial_consent_interval CHECK (billing_interval IN ('MONTH', 'YEAR')),
    CONSTRAINT chk_trial_consent_timing CHECK (charge_timing IN ('AFTER_TRIAL', 'IMMEDIATE')),
    CONSTRAINT chk_trial_consent_first_charge CHECK (first_charge_at >= original_trial_ends_at),
    CONSTRAINT chk_trial_consent_paid CHECK ((paid_invoice_id IS NULL AND paid_at IS NULL) OR (paid_invoice_id IS NOT NULL AND paid_at IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE billing_trial_entries
    DROP CHECK chk_trial_entry_status,
    DROP CHECK chk_trial_entry_window,
    ADD CONSTRAINT chk_trial_entry_status CHECK (status IN ('LEAD_CAPTURED', 'ACTIVE', 'CONVERTED')),
    ADD CONSTRAINT chk_trial_entry_window CHECK (
        (status = 'LEAD_CAPTURED' AND company_id IS NULL AND trial_starts_at IS NULL AND trial_ends_at IS NULL)
        OR (status IN ('ACTIVE', 'CONVERTED') AND company_id IS NOT NULL AND signup_intent_id IS NOT NULL
            AND trial_starts_at IS NOT NULL AND trial_ends_at IS NOT NULL AND trial_ends_at > trial_starts_at
            AND trial_terms_version IS NOT NULL AND trial_terms_accepted_at IS NOT NULL)
    );
