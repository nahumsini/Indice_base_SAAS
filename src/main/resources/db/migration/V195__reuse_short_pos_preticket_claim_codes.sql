ALTER TABLE pos_self_service_pretickets
    DROP INDEX uk_pos_self_service_claim_code,
    ADD KEY idx_pos_self_service_active_claim_code
        (company_id, cash_register_id, claim_code, status, expires_at);
