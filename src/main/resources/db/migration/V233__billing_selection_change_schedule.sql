-- A commercial selection is not the same thing as effective access.
--
-- DRAFT rows preserve a customer's intended first purchase without granting
-- courtesy entitlements. SCHEDULED rows preserve the exact Stripe terms that
-- will become effective after the invoice at the subscription cut-off is paid.
-- Only one active row of each kind is allowed per company/subscription.

CREATE TABLE company_billing_selection_changes (
    id BIGINT NOT NULL AUTO_INCREMENT,
    public_reference CHAR(36) NOT NULL,
    company_id BIGINT NOT NULL,
    subscription_id BIGINT NULL,
    change_kind VARCHAR(24) NOT NULL,
    status VARCHAR(24) NOT NULL,
    active_scope VARCHAR(160) NULL,
    effective_at TIMESTAMP(6) NULL,
    catalog_version_id BIGINT NOT NULL,
    offer_code VARCHAR(80) NOT NULL,
    billing_interval VARCHAR(16) NOT NULL,
    currency CHAR(3) NOT NULL,
    included_seats INT NOT NULL,
    extra_seats INT NOT NULL,
    base_amount_cents BIGINT NULL,
    extra_seat_unit_amount_cents BIGINT NOT NULL DEFAULT 0,
    complementary_amount_cents BIGINT NOT NULL DEFAULT 0,
    subtotal_amount_cents BIGINT NULL,
    discount_amount_cents BIGINT NOT NULL DEFAULT 0,
    estimated_amount_cents BIGINT NULL,
    promotion_code VARCHAR(80) NULL,
    external_promotion_code_id VARCHAR(255) NULL,
    request_fingerprint CHAR(64) NOT NULL,
    idempotency_key_hash CHAR(64) NOT NULL,
    requested_by_user_id BIGINT NOT NULL,
    requested_by_authority VARCHAR(32) NOT NULL,
    stripe_applied_at TIMESTAMP(6) NULL,
    applied_at TIMESTAMP(6) NULL,
    applied_event_id VARCHAR(255) NULL,
    failure_code VARCHAR(80) NULL,
    failure_message VARCHAR(500) NULL,
    superseded_by_change_id BIGINT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_company_billing_selection_change_reference (public_reference),
    UNIQUE KEY uq_company_billing_selection_change_idempotency (idempotency_key_hash),
    UNIQUE KEY uq_company_billing_selection_change_active_scope (active_scope),
    KEY idx_company_billing_selection_change_company (company_id, status, updated_at),
    KEY idx_company_billing_selection_change_subscription (subscription_id, status, effective_at),
    KEY idx_company_billing_selection_change_effective (status, effective_at),
    CONSTRAINT fk_company_billing_selection_change_company
        FOREIGN KEY (company_id) REFERENCES companies (id),
    CONSTRAINT fk_company_billing_selection_change_subscription
        FOREIGN KEY (subscription_id) REFERENCES company_billing_subscriptions (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_company_billing_selection_change_catalog
        FOREIGN KEY (catalog_version_id) REFERENCES billing_catalog_versions (id),
    CONSTRAINT fk_company_billing_selection_change_requester
        FOREIGN KEY (requested_by_user_id) REFERENCES users (id),
    CONSTRAINT fk_company_billing_selection_change_superseded
        FOREIGN KEY (superseded_by_change_id) REFERENCES company_billing_selection_changes (id),
    CONSTRAINT chk_company_billing_selection_change_kind
        CHECK (change_kind IN ('CHECKOUT_DRAFT', 'RENEWAL')),
    CONSTRAINT chk_company_billing_selection_change_status
        CHECK (status IN ('DRAFT', 'PENDING_STRIPE', 'SCHEDULED', 'APPLIED', 'SUPERSEDED', 'FAILED', 'CANCELED')),
    CONSTRAINT chk_company_billing_selection_change_authority
        CHECK (requested_by_authority IN ('CUSTOMER', 'PLATFORM_ROOT')),
    CONSTRAINT chk_company_billing_selection_change_seats
        CHECK (included_seats >= 0 AND extra_seats >= 0),
    CONSTRAINT chk_company_billing_selection_change_amounts
        CHECK (
            extra_seat_unit_amount_cents >= 0
            AND complementary_amount_cents >= 0
            AND discount_amount_cents >= 0
        )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE company_billing_selection_change_products (
    change_id BIGINT NOT NULL,
    catalog_product_id BIGINT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (change_id, catalog_product_id),
    KEY idx_company_billing_selection_change_product (catalog_product_id),
    CONSTRAINT fk_company_billing_selection_change_product_change
        FOREIGN KEY (change_id) REFERENCES company_billing_selection_changes (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_company_billing_selection_change_product_catalog
        FOREIGN KEY (catalog_product_id) REFERENCES billing_catalog_products (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
