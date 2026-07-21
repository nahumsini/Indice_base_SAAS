-- Premium multitenant phase 3: durable, exactly-once account provisioning.
-- This migration is expansive. It does not enable commercial enforcement.

INSERT INTO modules (slug, name, description, icon, badge_text, tier, sort_order, is_core, is_active)
SELECT 'receivables', 'Cartera', 'Cuentas por cobrar y seguimiento de cartera',
       'bi-journal-text', NULL, 'pro', 8, 0, 1
WHERE NOT EXISTS (SELECT 1 FROM modules WHERE slug = 'receivables');

ALTER TABLE billing_signup_intents
    ADD COLUMN provisioning_status VARCHAR(32) NOT NULL DEFAULT 'NOT_STARTED' AFTER company_id,
    ADD COLUMN owner_user_id BIGINT NULL AFTER provisioning_status,
    ADD COLUMN owner_user_company_id BIGINT NULL AFTER owner_user_id,
    ADD COLUMN provisioning_attempt_count INT NOT NULL DEFAULT 0 AFTER owner_user_company_id,
    ADD COLUMN provisioning_started_at TIMESTAMP(6) NULL AFTER provisioning_attempt_count,
    ADD COLUMN provisioned_at TIMESTAMP(6) NULL AFTER provisioning_started_at,
    ADD COLUMN provisioning_error_code VARCHAR(80) NULL AFTER provisioned_at,
    ADD COLUMN provisioning_error_message VARCHAR(500) NULL AFTER provisioning_error_code,
    ADD KEY idx_billing_signup_intents_provisioning (status, provisioning_status, completed_at),
    ADD KEY idx_billing_signup_intents_owner_user (owner_user_id),
    ADD KEY idx_billing_signup_intents_owner_membership (owner_user_company_id),
    ADD CONSTRAINT fk_billing_signup_intents_owner_user
        FOREIGN KEY (owner_user_id) REFERENCES users (id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_billing_signup_intents_owner_membership
        FOREIGN KEY (owner_user_company_id) REFERENCES user_companies (id) ON DELETE SET NULL;

CREATE TABLE company_ownerships (
    id BIGINT NOT NULL AUTO_INCREMENT,
    company_id BIGINT NOT NULL,
    owner_user_id BIGINT NOT NULL,
    owner_user_company_id BIGINT NOT NULL,
    source_signup_intent_id BIGINT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    ownership_started_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    ownership_ended_at TIMESTAMP(6) NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_company_ownerships_company (company_id),
    UNIQUE KEY uq_company_ownerships_owner_user (owner_user_id),
    UNIQUE KEY uq_company_ownerships_owner_membership (owner_user_company_id),
    UNIQUE KEY uq_company_ownerships_signup (source_signup_intent_id),
    CONSTRAINT fk_company_ownerships_company
        FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT fk_company_ownerships_owner_user
        FOREIGN KEY (owner_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT fk_company_ownerships_owner_membership
        FOREIGN KEY (owner_user_company_id) REFERENCES user_companies (id) ON DELETE RESTRICT,
    CONSTRAINT fk_company_ownerships_signup
        FOREIGN KEY (source_signup_intent_id) REFERENCES billing_signup_intents (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE company_trial_product_grants (
    company_id BIGINT NOT NULL,
    catalog_product_id BIGINT NOT NULL,
    source_signup_intent_id BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    starts_at TIMESTAMP(6) NOT NULL,
    ends_at TIMESTAMP(6) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (company_id, catalog_product_id),
    KEY idx_company_trial_product_grants_active (company_id, status, ends_at),
    KEY idx_company_trial_product_grants_signup (source_signup_intent_id),
    CONSTRAINT fk_company_trial_product_grants_company
        FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT fk_company_trial_product_grants_product
        FOREIGN KEY (catalog_product_id) REFERENCES billing_catalog_products (id) ON DELETE RESTRICT,
    CONSTRAINT fk_company_trial_product_grants_signup
        FOREIGN KEY (source_signup_intent_id) REFERENCES billing_signup_intents (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
