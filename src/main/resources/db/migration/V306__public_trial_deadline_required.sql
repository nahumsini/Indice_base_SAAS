-- Forward-only strengthening after V305 isolated validation: MySQL CHECK permits UNKNOWN.
-- An ACTIVE trial must have an explicit non-null deadline, not merely end > start.
ALTER TABLE billing_trial_entries
    DROP CHECK chk_trial_entry_window,
    ADD CONSTRAINT chk_trial_entry_window CHECK (
        (status = 'LEAD_CAPTURED' AND company_id IS NULL AND trial_starts_at IS NULL AND trial_ends_at IS NULL)
        OR (status = 'ACTIVE' AND company_id IS NOT NULL AND signup_intent_id IS NOT NULL
            AND trial_starts_at IS NOT NULL AND trial_ends_at IS NOT NULL AND trial_ends_at > trial_starts_at
            AND trial_terms_version IS NOT NULL AND trial_terms_accepted_at IS NOT NULL)
    );
