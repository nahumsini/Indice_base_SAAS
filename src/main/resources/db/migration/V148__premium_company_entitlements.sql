-- Premium multitenant phase 4: tenant-scoped commercial entitlements.
--
-- Existing companies are intentionally not enrolled. A policy row is the explicit
-- cohort boundary; without one, the legacy permission model remains authoritative.

CREATE TABLE company_entitlement_policies (
    company_id BIGINT NOT NULL,
    catalog_version_id BIGINT NULL,
    mode VARCHAR(20) NOT NULL DEFAULT 'SHADOW',
    reason VARCHAR(255) NULL,
    activated_by_user_id BIGINT NULL,
    activated_at TIMESTAMP(6) NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (company_id),
    KEY idx_company_entitlement_policies_mode (mode, company_id),
    CONSTRAINT fk_company_entitlement_policies_company
        FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT fk_company_entitlement_policies_catalog
        FOREIGN KEY (catalog_version_id) REFERENCES billing_catalog_versions (id) ON DELETE SET NULL,
    CONSTRAINT fk_company_entitlement_policies_actor
        FOREIGN KEY (activated_by_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE company_entitlements (
    id BIGINT NOT NULL AUTO_INCREMENT,
    company_id BIGINT NOT NULL,
    capability_code VARCHAR(80) NOT NULL,
    source_type VARCHAR(24) NOT NULL,
    source_reference VARCHAR(160) NOT NULL,
    catalog_version_id BIGINT NULL,
    valid_from TIMESTAMP(6) NULL,
    valid_until TIMESTAMP(6) NULL,
    projected_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_company_entitlements_source (
        company_id, capability_code, source_type, source_reference
    ),
    KEY idx_company_entitlements_effective (company_id, capability_code, valid_from, valid_until),
    CONSTRAINT fk_company_entitlements_company
        FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT fk_company_entitlements_catalog
        FOREIGN KEY (catalog_version_id) REFERENCES billing_catalog_versions (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE entitlement_decision_events (
    id BIGINT NOT NULL AUTO_INCREMENT,
    company_id BIGINT NOT NULL,
    user_id BIGINT NULL,
    user_company_id BIGINT NULL,
    policy_mode VARCHAR(20) NOT NULL,
    decision_type VARCHAR(24) NOT NULL,
    capability_code VARCHAR(80) NOT NULL,
    operation_code VARCHAR(20) NOT NULL,
    legacy_allowed TINYINT(1) NOT NULL,
    entitlement_allowed TINYINT(1) NOT NULL,
    effective_allowed TINYINT(1) NOT NULL,
    decision_source VARCHAR(500) NULL,
    http_method VARCHAR(12) NULL,
    request_path VARCHAR(500) NULL,
    request_id VARCHAR(80) NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    retain_until TIMESTAMP(6) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_entitlement_decision_events_company (company_id, created_at),
    KEY idx_entitlement_decision_events_retention (retain_until),
    KEY idx_entitlement_decision_events_capability (company_id, capability_code, created_at),
    CONSTRAINT fk_entitlement_decision_events_company
        FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT fk_entitlement_decision_events_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_entitlement_decision_events_membership
        FOREIGN KEY (user_company_id) REFERENCES user_companies (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Only tenants created by the premium signup path enter the first shadow cohort.
-- Legacy companies remain untouched until they are enrolled deliberately.
INSERT INTO company_entitlement_policies (
    company_id, catalog_version_id, mode, reason, activated_by_user_id, activated_at
)
SELECT DISTINCT g.company_id, p.catalog_version_id, 'SHADOW',
       'Premium signup shadow cohort', o.owner_user_id, CURRENT_TIMESTAMP(6)
FROM company_trial_product_grants g
JOIN billing_catalog_products p ON p.id = g.catalog_product_id
LEFT JOIN company_ownerships o ON o.company_id = g.company_id AND o.status = 'ACTIVE';
