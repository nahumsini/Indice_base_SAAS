-- Premium multitenant phase 6: durable commercial lifecycle and retention.
--
-- The lifecycle is enrolled only for companies that already have a premium
-- entitlement policy. Existing tenants without that policy remain untouched.
-- PURGE_PENDING is an auditable terminal marker; this migration deliberately
-- does not install any physical-delete job.

CREATE TABLE company_commercial_states (
    company_id BIGINT NOT NULL,
    state VARCHAR(24) NOT NULL DEFAULT 'ACTIVE',
    access_mode VARCHAR(24) NOT NULL DEFAULT 'FULL',
    subscription_status VARCHAR(40) NULL,
    payment_status VARCHAR(40) NULL,
    trial_ends_at TIMESTAMP(6) NULL,
    grace_started_at TIMESTAMP(6) NULL,
    grace_ends_at TIMESTAMP(6) NULL,
    read_only_started_at TIMESTAMP(6) NULL,
    read_only_ends_at TIMESTAMP(6) NULL,
    suspended_at TIMESTAMP(6) NULL,
    retention_until TIMESTAMP(6) NULL,
    purge_eligible_at TIMESTAMP(6) NULL,
    reason_code VARCHAR(80) NULL,
    last_source_event_id VARCHAR(255) NULL,
    last_source_event_created_at TIMESTAMP(6) NULL,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (company_id),
    KEY idx_company_commercial_states_due (state, grace_ends_at, read_only_ends_at, retention_until),
    CONSTRAINT fk_company_commercial_states_company
        FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE company_commercial_state_events (
    id BIGINT NOT NULL AUTO_INCREMENT,
    company_id BIGINT NOT NULL,
    source_type VARCHAR(32) NOT NULL,
    source_event_id VARCHAR(255) NULL,
    source_event_created_at TIMESTAMP(6) NULL,
    prior_state VARCHAR(24) NULL,
    new_state VARCHAR(24) NOT NULL,
    reason_code VARCHAR(80) NOT NULL,
    detail_json JSON NULL,
    occurred_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_company_commercial_state_source (source_type, source_event_id),
    KEY idx_company_commercial_state_events_company (company_id, occurred_at),
    CONSTRAINT fk_company_commercial_state_events_company
        FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE company_data_retention_jobs (
    id BIGINT NOT NULL AUTO_INCREMENT,
    company_id BIGINT NOT NULL,
    lifecycle_event_id BIGINT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'SCHEDULED',
    eligible_at TIMESTAMP(6) NOT NULL,
    approved_by_user_id BIGINT NULL,
    approved_at TIMESTAMP(6) NULL,
    executed_at TIMESTAMP(6) NULL,
    cancellation_reason VARCHAR(500) NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_company_data_retention_company (company_id, status),
    KEY idx_company_data_retention_due (status, eligible_at),
    CONSTRAINT fk_company_data_retention_company
        FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE,
    CONSTRAINT fk_company_data_retention_event
        FOREIGN KEY (lifecycle_event_id) REFERENCES company_commercial_state_events (id) ON DELETE SET NULL,
    CONSTRAINT fk_company_data_retention_approver
        FOREIGN KEY (approved_by_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO company_commercial_states (
    company_id, state, access_mode, subscription_status, payment_status,
    trial_ends_at, grace_started_at, grace_ends_at,
    last_source_event_id, last_source_event_created_at
)
SELECT policy.company_id,
       CASE
           WHEN sub.status = 'trialing' THEN 'TRIAL'
           WHEN sub.status IN ('canceled', 'paused') THEN 'SUSPENDED'
           WHEN sub.status IN ('past_due', 'unpaid', 'incomplete_expired') THEN 'GRACE'
           ELSE 'ACTIVE'
       END,
       CASE
           WHEN sub.status IN ('canceled', 'paused') THEN 'BILLING_ONLY'
           ELSE 'FULL'
       END,
       sub.status,
       sub.last_payment_status,
       sub.trial_ends_at,
       CASE WHEN sub.status IN ('past_due', 'unpaid', 'incomplete_expired')
            THEN CURRENT_TIMESTAMP(6) ELSE NULL END,
       CASE WHEN sub.status IN ('past_due', 'unpaid', 'incomplete_expired')
            THEN TIMESTAMPADD(DAY, 14, CURRENT_TIMESTAMP(6)) ELSE NULL END,
       sub.last_event_id,
       sub.last_event_created_at
FROM company_entitlement_policies policy
LEFT JOIN company_billing_subscriptions sub
  ON sub.id = (
      SELECT candidate.id
      FROM company_billing_subscriptions candidate
      WHERE candidate.company_id = policy.company_id
      ORDER BY candidate.last_event_created_at DESC, candidate.id DESC
      LIMIT 1
  );
