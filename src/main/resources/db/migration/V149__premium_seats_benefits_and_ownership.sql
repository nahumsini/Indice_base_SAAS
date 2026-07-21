-- Premium multitenant phase 5: platform authority, commercial benefits,
-- atomic seat reservations and audited ownership transfers.
--
-- This migration is expansive. Seat enforcement only applies to companies
-- explicitly enrolled in company_entitlement_policies.

CREATE TABLE platform_administrators (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    platform_role VARCHAR(32) NOT NULL DEFAULT 'PLATFORM_SUPPORT',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    mfa_required TINYINT(1) NOT NULL DEFAULT 1,
    created_by_user_id BIGINT NULL,
    revoked_by_user_id BIGINT NULL,
    revoked_at TIMESTAMP(6) NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_platform_administrators_user (user_id),
    KEY idx_platform_administrators_status (status, platform_role),
    CONSTRAINT fk_platform_administrators_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_platform_administrators_created_by
        FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_platform_administrators_revoked_by
        FOREIGN KEY (revoked_by_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE platform_administrator_permissions (
    platform_administrator_id BIGINT NOT NULL,
    permission_code VARCHAR(80) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (platform_administrator_id, permission_code),
    CONSTRAINT fk_platform_administrator_permissions_admin
        FOREIGN KEY (platform_administrator_id) REFERENCES platform_administrators (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE platform_audit_events (
    id BIGINT NOT NULL AUTO_INCREMENT,
    actor_user_id BIGINT NULL,
    action_code VARCHAR(100) NOT NULL,
    target_type VARCHAR(60) NOT NULL,
    target_reference VARCHAR(160) NULL,
    company_id BIGINT NULL,
    outcome VARCHAR(24) NOT NULL,
    request_id VARCHAR(100) NULL,
    detail_json JSON NULL,
    occurred_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    retain_until TIMESTAMP(6) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_platform_audit_events_actor (actor_user_id, occurred_at),
    KEY idx_platform_audit_events_company (company_id, occurred_at),
    KEY idx_platform_audit_events_retention (retain_until),
    CONSTRAINT fk_platform_audit_events_actor
        FOREIGN KEY (actor_user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_platform_audit_events_company
        FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Existing application root users bootstrap the new, independent platform authority.
-- Future platform access is managed only through platform_administrators.
INSERT INTO platform_administrators (user_id, platform_role, status, mfa_required, created_by_user_id)
SELECT DISTINCT uc.user_id, 'PLATFORM_ROOT', 'ACTIVE', 1, uc.user_id
FROM user_companies uc
WHERE LOWER(COALESCE(uc.role, '')) = 'root';

CREATE TABLE company_benefit_grants (
    id BIGINT NOT NULL AUTO_INCREMENT,
    public_reference CHAR(32) NOT NULL,
    company_id BIGINT NOT NULL,
    benefit_type VARCHAR(24) NOT NULL,
    catalog_product_id BIGINT NULL,
    quantity INT NOT NULL DEFAULT 1,
    source_type VARCHAR(24) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    starts_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    ends_at TIMESTAMP(6) NULL,
    reason VARCHAR(500) NOT NULL,
    campaign_code VARCHAR(80) NULL,
    stripe_coupon_id VARCHAR(255) NULL,
    stripe_promotion_code_id VARCHAR(255) NULL,
    idempotency_key_hash CHAR(64) NOT NULL,
    created_by_user_id BIGINT NOT NULL,
    revoked_by_user_id BIGINT NULL,
    revoked_at TIMESTAMP(6) NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_company_benefit_grants_public_reference (public_reference),
    UNIQUE KEY uq_company_benefit_grants_idempotency (idempotency_key_hash),
    KEY idx_company_benefit_grants_effective (company_id, benefit_type, status, starts_at, ends_at),
    KEY idx_company_benefit_grants_product (catalog_product_id),
    CONSTRAINT fk_company_benefit_grants_company
        FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT fk_company_benefit_grants_product
        FOREIGN KEY (catalog_product_id) REFERENCES billing_catalog_products (id) ON DELETE RESTRICT,
    CONSTRAINT fk_company_benefit_grants_created_by
        FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT fk_company_benefit_grants_revoked_by
        FOREIGN KEY (revoked_by_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE company_seat_states (
    company_id BIGINT NOT NULL,
    included_seats INT NOT NULL DEFAULT 5,
    purchased_extra_seats INT NOT NULL DEFAULT 0,
    reserved_seats INT NOT NULL DEFAULT 0,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (company_id),
    CONSTRAINT fk_company_seat_states_company
        FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE company_seat_reservations (
    id BIGINT NOT NULL AUTO_INCREMENT,
    company_id BIGINT NOT NULL,
    invitation_id BIGINT NULL,
    email_normalized VARCHAR(190) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'RESERVED',
    expires_at TIMESTAMP(6) NOT NULL,
    idempotency_key_hash CHAR(64) NOT NULL,
    reserved_by_user_id BIGINT NOT NULL,
    consumed_by_user_company_id BIGINT NULL,
    consumed_at TIMESTAMP(6) NULL,
    released_at TIMESTAMP(6) NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_company_seat_reservations_invitation (invitation_id),
    UNIQUE KEY uq_company_seat_reservations_idempotency (idempotency_key_hash),
    KEY idx_company_seat_reservations_active (company_id, status, expires_at),
    CONSTRAINT fk_company_seat_reservations_company
        FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT fk_company_seat_reservations_invitation
        FOREIGN KEY (invitation_id) REFERENCES user_invitations (id) ON DELETE SET NULL,
    CONSTRAINT fk_company_seat_reservations_actor
        FOREIGN KEY (reserved_by_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT fk_company_seat_reservations_membership
        FOREIGN KEY (consumed_by_user_company_id) REFERENCES user_companies (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE company_seat_mutations (
    id BIGINT NOT NULL AUTO_INCREMENT,
    public_reference CHAR(32) NOT NULL,
    company_id BIGINT NOT NULL,
    idempotency_key_hash CHAR(64) NOT NULL,
    request_fingerprint CHAR(64) NOT NULL,
    prior_extra_seats INT NOT NULL,
    target_extra_seats INT NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'PREPARED',
    stripe_subscription_id VARCHAR(255) NULL,
    stripe_subscription_item_id VARCHAR(255) NULL,
    failure_code VARCHAR(80) NULL,
    failure_message VARCHAR(500) NULL,
    actor_user_id BIGINT NOT NULL,
    completed_at TIMESTAMP(6) NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_company_seat_mutations_public_reference (public_reference),
    UNIQUE KEY uq_company_seat_mutations_idempotency (idempotency_key_hash),
    KEY idx_company_seat_mutations_recovery (status, updated_at),
    KEY idx_company_seat_mutations_company (company_id, created_at),
    CONSTRAINT fk_company_seat_mutations_company
        FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT fk_company_seat_mutations_actor
        FOREIGN KEY (actor_user_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE company_billing_subscriptions
    ADD COLUMN stripe_extra_seat_item_id VARCHAR(255) NULL AFTER extra_seats;

CREATE TABLE company_ownership_transfer_requests (
    id BIGINT NOT NULL AUTO_INCREMENT,
    public_reference CHAR(32) NOT NULL,
    company_id BIGINT NOT NULL,
    from_user_id BIGINT NOT NULL,
    to_user_id BIGINT NOT NULL,
    token_hash CHAR(64) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'PENDING',
    reason VARCHAR(500) NULL,
    expires_at TIMESTAMP(6) NOT NULL,
    accepted_at TIMESTAMP(6) NULL,
    canceled_at TIMESTAMP(6) NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_company_ownership_transfer_public (public_reference),
    UNIQUE KEY uq_company_ownership_transfer_token (token_hash),
    KEY idx_company_ownership_transfer_pending (company_id, status, expires_at),
    CONSTRAINT fk_company_ownership_transfer_company
        FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT fk_company_ownership_transfer_from_user
        FOREIGN KEY (from_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT fk_company_ownership_transfer_to_user
        FOREIGN KEY (to_user_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE company_ownership_history (
    id BIGINT NOT NULL AUTO_INCREMENT,
    company_id BIGINT NOT NULL,
    transfer_request_id BIGINT NULL,
    from_user_id BIGINT NULL,
    to_user_id BIGINT NOT NULL,
    action_code VARCHAR(40) NOT NULL,
    reason VARCHAR(500) NULL,
    actor_user_id BIGINT NOT NULL,
    occurred_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_company_ownership_history_company (company_id, occurred_at),
    CONSTRAINT fk_company_ownership_history_company
        FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT fk_company_ownership_history_request
        FOREIGN KEY (transfer_request_id) REFERENCES company_ownership_transfer_requests (id) ON DELETE SET NULL,
    CONSTRAINT fk_company_ownership_history_from_user
        FOREIGN KEY (from_user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_company_ownership_history_to_user
        FOREIGN KEY (to_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT fk_company_ownership_history_actor
        FOREIGN KEY (actor_user_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Only premium-enrolled companies receive a finite seat ledger. Historical
-- companies remain on the legacy model until explicitly enrolled.
INSERT INTO company_seat_states (company_id, included_seats, purchased_extra_seats, reserved_seats)
SELECT policy.company_id,
       GREATEST(
           5,
           COALESCE(subscription.included_seats, 5),
           COALESCE(active_memberships.active_count, 0) + COALESCE(pending_invitations.pending_count, 0)
       ),
       COALESCE(subscription.extra_seats, 0),
       0
FROM company_entitlement_policies policy
LEFT JOIN company_billing_subscriptions subscription
  ON subscription.company_id = policy.company_id
 AND subscription.id = (
     SELECT MAX(candidate.id)
     FROM company_billing_subscriptions candidate
     WHERE candidate.company_id = policy.company_id
 )
LEFT JOIN (
    SELECT company_id, COUNT(*) AS active_count
    FROM user_companies
    WHERE LOWER(COALESCE(status, 'active')) = 'active'
    GROUP BY company_id
) active_memberships ON active_memberships.company_id = policy.company_id
LEFT JOIN (
    SELECT company_id, COUNT(*) AS pending_count
    FROM user_invitations
    WHERE LOWER(COALESCE(status, 'pending')) = 'pending'
      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP(6))
    GROUP BY company_id
) pending_invitations ON pending_invitations.company_id = policy.company_id;

