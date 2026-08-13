-- Connect an already provisioned demo/courtesy company to Stripe without
-- creating a second tenant or owner. Existing rows remain ordinary signups.

ALTER TABLE billing_signup_intents
    ADD COLUMN intent_kind VARCHAR(32) NOT NULL DEFAULT 'SIGNUP' AFTER status,
    ADD KEY idx_billing_signup_intents_kind_company (intent_kind, company_id),
    ADD CONSTRAINT chk_billing_signup_intents_kind
        CHECK (intent_kind IN ('SIGNUP', 'EXISTING_COMPANY_ACTIVATION'));

