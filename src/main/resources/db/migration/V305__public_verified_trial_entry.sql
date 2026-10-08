-- Billing-owned pre-tenant entry; company_id is assigned atomically by native provisioning.
-- No paid subscription, Stripe identifier or existing catalog is fabricated or modified.
CREATE TABLE billing_trial_entries (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    reference_hash CHAR(64) NOT NULL,
    browser_session_hash CHAR(64) NOT NULL,
    request_idempotency_hash CHAR(64) NOT NULL,
    request_fingerprint CHAR(64) NOT NULL,
    policy_code VARCHAR(64) NOT NULL DEFAULT 'VERIFIED_NO_CARD_15D_V1',
    lead_id BIGINT NOT NULL,
    country_code CHAR(2) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'LEAD_CAPTURED',
    signup_intent_id BIGINT NULL,
    company_id BIGINT NULL,
    continuation_expires_at DATETIME(6) NOT NULL,
    trial_starts_at DATETIME(6) NULL,
    trial_ends_at DATETIME(6) NULL,
    trial_terms_version VARCHAR(64) NULL,
    trial_terms_accepted_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    UNIQUE KEY uq_trial_entry_reference (reference_hash),
    UNIQUE KEY uq_trial_entry_request (request_idempotency_hash),
    UNIQUE KEY uq_trial_entry_lead (lead_id),
    UNIQUE KEY uq_trial_entry_intent (signup_intent_id),
    UNIQUE KEY uq_trial_entry_company (company_id),
    CONSTRAINT fk_trial_entry_lead FOREIGN KEY (lead_id) REFERENCES platform_leads(id),
    CONSTRAINT fk_trial_entry_intent FOREIGN KEY (signup_intent_id) REFERENCES billing_signup_intents(id),
    CONSTRAINT fk_trial_entry_company FOREIGN KEY (company_id) REFERENCES companies(id),
    CONSTRAINT chk_trial_entry_country CHECK (country_code IN ('MX', 'CA')),
    CONSTRAINT chk_trial_entry_status CHECK (status IN ('LEAD_CAPTURED', 'ACTIVE')),
    CONSTRAINT chk_trial_entry_window CHECK (
        (status = 'LEAD_CAPTURED' AND company_id IS NULL AND trial_starts_at IS NULL AND trial_ends_at IS NULL)
        OR (status = 'ACTIVE' AND company_id IS NOT NULL AND signup_intent_id IS NOT NULL
            AND trial_starts_at IS NOT NULL AND trial_ends_at > trial_starts_at
            AND trial_terms_version IS NOT NULL AND trial_terms_accepted_at IS NOT NULL)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
