-- Preserve statement identity and accounting context across prospective fund type changes.
ALTER TABLE finance_petty_cash_funds ADD COLUMN type_stage_id BIGINT NOT NULL DEFAULT 0;
ALTER TABLE finance_petty_cash_statements
    ADD COLUMN type_stage_id BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN fund_snapshot_json JSON NULL,
    DROP INDEX uq_finance_petty_cash_statements_fund_period,
    ADD UNIQUE KEY uq_finance_petty_cash_statements_fund_stage_period (petty_cash_fund_id, type_stage_id, period_key);

UPDATE finance_petty_cash_statements s
JOIN finance_petty_cash_funds f ON f.id = s.petty_cash_fund_id AND f.company_id = s.company_id
SET s.fund_snapshot_json = JSON_OBJECT(
    'fundType', s.fund_type_snapshot, 'budgetId', f.budget_id, 'budgetLineId', f.budget_line_id,
    'paymentAccountId', f.payment_account_id, 'fundingSourcePaymentAccountId', f.funding_source_payment_account_id,
    'fundingSourceName', f.funding_source_name, 'unitId', f.unit_id, 'businessId', f.business_id,
    'responsibleUserId', s.responsible_user_id,
    'externalOwnerType', s.external_owner_type_snapshot, 'externalOwnerName', s.external_owner_name_snapshot,
    'externalOwnerRelationship', s.external_owner_relationship_snapshot,
    'externalOwnerReference', s.external_owner_reference_snapshot,
    'statementRecipientEmail', s.statement_recipient_email_snapshot,
    'managedAssetType', s.managed_asset_type_snapshot, 'managedAssetName', s.managed_asset_name_snapshot,
    'managedAssetReference', s.managed_asset_reference_snapshot,
    'managedAssetsJson', s.managed_assets_snapshot_json);

CREATE TABLE finance_petty_cash_type_changes (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT NOT NULL,
    petty_cash_fund_id BIGINT NOT NULL,
    previous_type VARCHAR(32) NOT NULL,
    next_type VARCHAR(32) NOT NULL,
    effective_date DATE NOT NULL,
    reason VARCHAR(500) NOT NULL,
    configuration_json JSON NOT NULL,
    previous_configuration_json JSON NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'SCHEDULED',
    created_by_user_id BIGINT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    applied_at TIMESTAMP(6) NULL,
    cancelled_at TIMESTAMP(6) NULL,
    cancelled_by_user_id BIGINT NULL,
    pending_fund_id BIGINT GENERATED ALWAYS AS (CASE WHEN status = 'SCHEDULED' THEN petty_cash_fund_id ELSE NULL END) STORED,
    UNIQUE KEY uq_petty_cash_pending_type_change (company_id, pending_fund_id),
    KEY idx_petty_cash_type_change_history (company_id, petty_cash_fund_id, effective_date),
    KEY idx_petty_cash_due_type_change (status, effective_date),
    CONSTRAINT fk_petty_cash_type_change_fund FOREIGN KEY (petty_cash_fund_id) REFERENCES finance_petty_cash_funds(id)
);
