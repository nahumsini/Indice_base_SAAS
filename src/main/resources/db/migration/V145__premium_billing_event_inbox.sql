CREATE TABLE billing_catalog_prices (
    id BIGINT NOT NULL AUTO_INCREMENT,
    catalog_version_id BIGINT NOT NULL,
    billable_code VARCHAR(80) NOT NULL,
    price_type VARCHAR(24) NOT NULL,
    billing_interval VARCHAR(16) NOT NULL,
    currency CHAR(3) NOT NULL,
    unit_amount_cents BIGINT NULL,
    included_quantity INT NOT NULL DEFAULT 0,
    external_price_id VARCHAR(255) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    effective_from TIMESTAMP(6) NULL,
    effective_to TIMESTAMP(6) NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_billing_catalog_prices_definition (
        catalog_version_id,
        billable_code,
        billing_interval,
        currency
    ),
    KEY idx_billing_catalog_prices_active (
        catalog_version_id,
        status,
        billing_interval,
        currency
    ),
    CONSTRAINT fk_billing_catalog_prices_version
        FOREIGN KEY (catalog_version_id) REFERENCES billing_catalog_versions (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE billing_signup_intents (
    id BIGINT NOT NULL AUTO_INCREMENT,
    public_token_hash CHAR(64) NOT NULL,
    request_idempotency_hash CHAR(64) NOT NULL,
    request_fingerprint CHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    catalog_version_id BIGINT NOT NULL,
    offer_code VARCHAR(80) NOT NULL,
    billing_interval VARCHAR(16) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    included_seats INT NOT NULL DEFAULT 5,
    requested_extra_seats INT NOT NULL DEFAULT 0,
    estimated_amount_cents BIGINT NULL,
    full_name VARCHAR(160) NOT NULL,
    email_normalized VARCHAR(190) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    company_name VARCHAR(160) NOT NULL,
    country_code CHAR(2) NOT NULL,
    phone VARCHAR(40) NULL,
    industry VARCHAR(120) NULL,
    company_size VARCHAR(40) NULL,
    stripe_customer_id VARCHAR(255) NULL,
    stripe_checkout_session_id VARCHAR(255) NULL,
    stripe_subscription_id VARCHAR(255) NULL,
    checkout_url TEXT NULL,
    company_id BIGINT NULL,
    last_stripe_event_id VARCHAR(255) NULL,
    last_stripe_event_created_at TIMESTAMP(6) NULL,
    checkout_expires_at TIMESTAMP(6) NULL,
    completed_at TIMESTAMP(6) NULL,
    failure_code VARCHAR(80) NULL,
    failure_message VARCHAR(500) NULL,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_billing_signup_intents_public_token_hash (public_token_hash),
    UNIQUE KEY uq_billing_signup_intents_idempotency_hash (request_idempotency_hash),
    UNIQUE KEY uq_billing_signup_intents_checkout (stripe_checkout_session_id),
    UNIQUE KEY uq_billing_signup_intents_subscription (stripe_subscription_id),
    KEY idx_billing_signup_intents_email_status (email_normalized, status, created_at),
    KEY idx_billing_signup_intents_expiry (status, checkout_expires_at),
    KEY idx_billing_signup_intents_customer (stripe_customer_id),
    KEY idx_billing_signup_intents_company (company_id),
    CONSTRAINT fk_billing_signup_intents_catalog
        FOREIGN KEY (catalog_version_id) REFERENCES billing_catalog_versions (id),
    CONSTRAINT fk_billing_signup_intents_company
        FOREIGN KEY (company_id) REFERENCES companies (id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE billing_signup_intent_products (
    signup_intent_id BIGINT NOT NULL,
    catalog_product_id BIGINT NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (signup_intent_id, catalog_product_id),
    KEY idx_billing_signup_intent_products_product (catalog_product_id),
    CONSTRAINT fk_billing_signup_intent_products_intent
        FOREIGN KEY (signup_intent_id) REFERENCES billing_signup_intents (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_billing_signup_intent_products_product
        FOREIGN KEY (catalog_product_id) REFERENCES billing_catalog_products (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE company_billing_customers (
    id BIGINT NOT NULL AUTO_INCREMENT,
    company_id BIGINT NOT NULL,
    stripe_customer_id VARCHAR(255) NOT NULL,
    source_signup_intent_id BIGINT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_company_billing_customers_company (company_id),
    UNIQUE KEY uq_company_billing_customers_stripe (stripe_customer_id),
    KEY idx_company_billing_customers_signup (source_signup_intent_id),
    CONSTRAINT fk_company_billing_customers_company
        FOREIGN KEY (company_id) REFERENCES companies (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_company_billing_customers_signup
        FOREIGN KEY (source_signup_intent_id) REFERENCES billing_signup_intents (id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE company_billing_subscriptions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    stripe_subscription_id VARCHAR(255) NOT NULL,
    stripe_customer_id VARCHAR(255) NULL,
    company_id BIGINT NULL,
    signup_intent_id BIGINT NULL,
    catalog_version_id BIGINT NULL,
    offer_code VARCHAR(80) NULL,
    billing_interval VARCHAR(16) NULL,
    currency CHAR(3) NULL,
    status VARCHAR(40) NOT NULL,
    collection_method VARCHAR(40) NULL,
    included_seats INT NOT NULL DEFAULT 5,
    extra_seats INT NOT NULL DEFAULT 0,
    cancel_at_period_end TINYINT(1) NOT NULL DEFAULT 0,
    trial_starts_at TIMESTAMP(6) NULL,
    trial_ends_at TIMESTAMP(6) NULL,
    current_period_starts_at TIMESTAMP(6) NULL,
    current_period_ends_at TIMESTAMP(6) NULL,
    canceled_at TIMESTAMP(6) NULL,
    latest_invoice_id VARCHAR(255) NULL,
    last_payment_status VARCHAR(40) NULL,
    last_event_id VARCHAR(255) NOT NULL,
    last_event_created_at TIMESTAMP(6) NOT NULL,
    projection_version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_company_billing_subscriptions_stripe (stripe_subscription_id),
    KEY idx_company_billing_subscriptions_company (company_id, status),
    KEY idx_company_billing_subscriptions_signup (signup_intent_id),
    KEY idx_company_billing_subscriptions_customer (stripe_customer_id),
    KEY idx_company_billing_subscriptions_unassociated (company_id, signup_intent_id, updated_at),
    CONSTRAINT fk_company_billing_subscriptions_company
        FOREIGN KEY (company_id) REFERENCES companies (id)
        ON DELETE SET NULL,
    CONSTRAINT fk_company_billing_subscriptions_signup
        FOREIGN KEY (signup_intent_id) REFERENCES billing_signup_intents (id)
        ON DELETE SET NULL,
    CONSTRAINT fk_company_billing_subscriptions_catalog
        FOREIGN KEY (catalog_version_id) REFERENCES billing_catalog_versions (id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE company_billing_subscription_products (
    subscription_id BIGINT NOT NULL,
    catalog_product_id BIGINT NOT NULL,
    source VARCHAR(32) NOT NULL DEFAULT 'SIGNUP_INTENT',
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (subscription_id, catalog_product_id),
    KEY idx_company_billing_subscription_products_product (catalog_product_id),
    CONSTRAINT fk_company_billing_subscription_products_subscription
        FOREIGN KEY (subscription_id) REFERENCES company_billing_subscriptions (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_company_billing_subscription_products_product
        FOREIGN KEY (catalog_product_id) REFERENCES billing_catalog_products (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE billing_invoice_snapshots (
    id BIGINT NOT NULL AUTO_INCREMENT,
    stripe_invoice_id VARCHAR(255) NOT NULL,
    stripe_subscription_id VARCHAR(255) NULL,
    stripe_customer_id VARCHAR(255) NULL,
    company_id BIGINT NULL,
    status VARCHAR(40) NULL,
    currency CHAR(3) NULL,
    amount_due_cents BIGINT NULL,
    amount_paid_cents BIGINT NULL,
    hosted_invoice_url TEXT NULL,
    invoice_pdf_url TEXT NULL,
    period_starts_at TIMESTAMP(6) NULL,
    period_ends_at TIMESTAMP(6) NULL,
    last_event_id VARCHAR(255) NOT NULL,
    last_event_created_at TIMESTAMP(6) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_billing_invoice_snapshots_stripe (stripe_invoice_id),
    KEY idx_billing_invoice_snapshots_subscription (stripe_subscription_id),
    KEY idx_billing_invoice_snapshots_company (company_id, created_at),
    CONSTRAINT fk_billing_invoice_snapshots_company
        FOREIGN KEY (company_id) REFERENCES companies (id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE stripe_webhook_events (
    id BIGINT NOT NULL AUTO_INCREMENT,
    stripe_event_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(160) NOT NULL,
    livemode TINYINT(1) NOT NULL DEFAULT 0,
    stripe_api_version VARCHAR(40) NULL,
    object_id VARCHAR(255) NULL,
    object_type VARCHAR(80) NULL,
    payload_sha256 CHAR(64) NOT NULL,
    raw_payload MEDIUMTEXT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'RECEIVED',
    attempt_count INT NOT NULL DEFAULT 0,
    duplicate_count INT NOT NULL DEFAULT 0,
    available_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    lease_owner VARCHAR(80) NULL,
    lease_expires_at TIMESTAMP(6) NULL,
    last_error_code VARCHAR(80) NULL,
    last_error_message VARCHAR(500) NULL,
    company_id BIGINT NULL,
    signup_intent_id BIGINT NULL,
    stripe_subscription_id VARCHAR(255) NULL,
    event_created_at TIMESTAMP(6) NOT NULL,
    first_received_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    last_received_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    processed_at TIMESTAMP(6) NULL,
    payload_retention_until TIMESTAMP(6) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_stripe_webhook_events_stripe_event (stripe_event_id),
    KEY idx_stripe_webhook_events_dispatch (status, available_at, event_created_at),
    KEY idx_stripe_webhook_events_lease (status, lease_expires_at),
    KEY idx_stripe_webhook_events_subscription (stripe_subscription_id),
    KEY idx_stripe_webhook_events_signup (signup_intent_id),
    KEY idx_stripe_webhook_events_payload_retention (payload_retention_until),
    CONSTRAINT fk_stripe_webhook_events_company
        FOREIGN KEY (company_id) REFERENCES companies (id)
        ON DELETE SET NULL,
    CONSTRAINT fk_stripe_webhook_events_signup
        FOREIGN KEY (signup_intent_id) REFERENCES billing_signup_intents (id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE billing_audit_events (
    id BIGINT NOT NULL AUTO_INCREMENT,
    event_category VARCHAR(60) NOT NULL,
    action_code VARCHAR(100) NOT NULL,
    outcome VARCHAR(32) NOT NULL,
    request_id VARCHAR(100) NULL,
    idempotency_key_hash CHAR(64) NULL,
    stripe_event_id VARCHAR(255) NULL,
    stripe_object_id VARCHAR(255) NULL,
    company_id BIGINT NULL,
    signup_intent_id BIGINT NULL,
    actor_user_id BIGINT NULL,
    detail_json JSON NULL,
    occurred_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_billing_audit_events_category_time (event_category, occurred_at),
    KEY idx_billing_audit_events_stripe (stripe_event_id),
    KEY idx_billing_audit_events_company (company_id, occurred_at),
    KEY idx_billing_audit_events_signup (signup_intent_id, occurred_at),
    CONSTRAINT fk_billing_audit_events_company
        FOREIGN KEY (company_id) REFERENCES companies (id)
        ON DELETE SET NULL,
    CONSTRAINT fk_billing_audit_events_signup
        FOREIGN KEY (signup_intent_id) REFERENCES billing_signup_intents (id)
        ON DELETE SET NULL,
    CONSTRAINT fk_billing_audit_events_actor
        FOREIGN KEY (actor_user_id) REFERENCES users (id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
