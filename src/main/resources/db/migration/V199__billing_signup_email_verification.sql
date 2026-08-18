-- Require email ownership proof before a premium signup can create Stripe Checkout.

CREATE TABLE billing_signup_email_verifications (
    id BIGINT NOT NULL AUTO_INCREMENT,
    verification_reference CHAR(64) NOT NULL,
    email_normalized VARCHAR(190) NOT NULL,
    full_name VARCHAR(160) NOT NULL,
    company_name VARCHAR(160) NOT NULL,
    otp_hash CHAR(64) NOT NULL,
    destination_hint VARCHAR(190) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'PENDING',
    attempt_count INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 5,
    resend_count INT NOT NULL DEFAULT 0,
    last_sent_at TIMESTAMP(6) NULL,
    email_sent_at TIMESTAMP(6) NULL,
    email_failure_message VARCHAR(255) NULL,
    expires_at TIMESTAMP(6) NOT NULL,
    verified_at TIMESTAMP(6) NULL,
    verified_expires_at TIMESTAMP(6) NULL,
    locked_at TIMESTAMP(6) NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_billing_signup_email_verifications_ref (verification_reference),
    KEY idx_billing_signup_email_verifications_email (email_normalized, status, created_at),
    KEY idx_billing_signup_email_verifications_expiry (status, expires_at),
    KEY idx_billing_signup_email_verifications_verified (email_normalized, verified_expires_at),
    CONSTRAINT chk_billing_signup_email_verifications_status
        CHECK (status IN ('PENDING', 'VERIFIED', 'LOCKED', 'EXPIRED', 'EMAIL_FAILED')),
    CONSTRAINT chk_billing_signup_email_verifications_attempts
        CHECK (attempt_count >= 0 AND max_attempts > 0 AND resend_count >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE billing_signup_intents
    ADD COLUMN email_verification_reference CHAR(64) NULL AFTER email_normalized,
    ADD COLUMN email_verified_at TIMESTAMP(6) NULL AFTER email_verification_reference,
    ADD KEY idx_billing_signup_intents_email_verification (email_verification_reference),
    ADD CONSTRAINT fk_billing_signup_intents_email_verification
        FOREIGN KEY (email_verification_reference)
        REFERENCES billing_signup_email_verifications (verification_reference)
        ON DELETE SET NULL;
