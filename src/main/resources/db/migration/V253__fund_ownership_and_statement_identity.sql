ALTER TABLE finance_petty_cash_funds
  ADD COLUMN fund_type VARCHAR(32) NULL AFTER responsible_user_id,
  ADD COLUMN external_owner_type VARCHAR(32) NULL AFTER funding_source_name,
  ADD COLUMN external_owner_name VARCHAR(180) NULL AFTER external_owner_type,
  ADD COLUMN external_owner_relationship VARCHAR(40) NULL AFTER external_owner_name,
  ADD COLUMN external_owner_reference VARCHAR(120) NULL AFTER external_owner_relationship,
  ADD COLUMN statement_recipient_email VARCHAR(254) NULL AFTER external_owner_reference,
  ADD COLUMN managed_asset_type VARCHAR(48) NULL AFTER statement_recipient_email,
  ADD COLUMN managed_asset_name VARCHAR(180) NULL AFTER managed_asset_type,
  ADD COLUMN managed_asset_reference VARCHAR(120) NULL AFTER managed_asset_name,
  ADD COLUMN external_identity_pending BOOLEAN NOT NULL DEFAULT FALSE AFTER managed_asset_reference;

UPDATE finance_petty_cash_funds
SET fund_type = CASE
      WHEN funding_source_payment_account_id IS NOT NULL
        OR budget_id IS NOT NULL
        OR budget_line_id IS NOT NULL
        THEN 'INTERNAL_COMPANY'
      ELSE 'EXTERNAL_MANAGED'
    END,
    external_identity_pending = CASE
      WHEN funding_source_payment_account_id IS NULL
        AND budget_id IS NULL
        AND budget_line_id IS NULL
        THEN TRUE
      ELSE FALSE
    END
WHERE fund_type IS NULL;

ALTER TABLE finance_petty_cash_funds
  MODIFY COLUMN fund_type VARCHAR(32) NOT NULL,
  ADD KEY idx_finance_petty_cash_funds_type (company_id, fund_type, deleted_at),
  ADD CONSTRAINT chk_finance_petty_cash_funds_type
    CHECK (fund_type IN ('INTERNAL_COMPANY', 'EXTERNAL_MANAGED'));

ALTER TABLE finance_petty_cash_statements
  ADD COLUMN fund_type_snapshot VARCHAR(32) NULL AFTER petty_cash_fund_id,
  ADD COLUMN external_owner_type_snapshot VARCHAR(32) NULL AFTER responsible_user_id,
  ADD COLUMN external_owner_name_snapshot VARCHAR(180) NULL AFTER external_owner_type_snapshot,
  ADD COLUMN external_owner_relationship_snapshot VARCHAR(40) NULL AFTER external_owner_name_snapshot,
  ADD COLUMN external_owner_reference_snapshot VARCHAR(120) NULL AFTER external_owner_relationship_snapshot,
  ADD COLUMN statement_recipient_email_snapshot VARCHAR(254) NULL AFTER external_owner_reference_snapshot,
  ADD COLUMN managed_asset_type_snapshot VARCHAR(48) NULL AFTER statement_recipient_email_snapshot,
  ADD COLUMN managed_asset_name_snapshot VARCHAR(180) NULL AFTER managed_asset_type_snapshot,
  ADD COLUMN managed_asset_reference_snapshot VARCHAR(120) NULL AFTER managed_asset_name_snapshot;

UPDATE finance_petty_cash_statements statement
JOIN finance_petty_cash_funds fund
  ON fund.id = statement.petty_cash_fund_id
 AND fund.company_id = statement.company_id
SET statement.fund_type_snapshot = fund.fund_type,
    statement.external_owner_type_snapshot = fund.external_owner_type,
    statement.external_owner_name_snapshot = fund.external_owner_name,
    statement.external_owner_relationship_snapshot = fund.external_owner_relationship,
    statement.external_owner_reference_snapshot = fund.external_owner_reference,
    statement.statement_recipient_email_snapshot = fund.statement_recipient_email,
    statement.managed_asset_type_snapshot = fund.managed_asset_type,
    statement.managed_asset_name_snapshot = fund.managed_asset_name,
    statement.managed_asset_reference_snapshot = fund.managed_asset_reference
WHERE statement.fund_type_snapshot IS NULL;

ALTER TABLE finance_petty_cash_statements
  MODIFY COLUMN fund_type_snapshot VARCHAR(32) NOT NULL,
  ADD CONSTRAINT chk_finance_petty_cash_statements_fund_type
    CHECK (fund_type_snapshot IN ('INTERNAL_COMPANY', 'EXTERNAL_MANAGED'));

ALTER TABLE finance_petty_cash_movements
  ADD COLUMN entry_category VARCHAR(48) NULL AFTER external_source_name,
  ADD COLUMN counterparty_name VARCHAR(180) NULL AFTER entry_category,
  ADD COLUMN statement_description VARCHAR(240) NULL AFTER counterparty_name,
  ADD COLUMN funding_method VARCHAR(80) NULL AFTER statement_description,
  ADD COLUMN internal_note VARCHAR(500) NULL AFTER funding_method;

UPDATE finance_petty_cash_movements movement
JOIN finance_petty_cash_funds fund
  ON fund.id = movement.petty_cash_fund_id
 AND fund.company_id = movement.company_id
SET movement.entry_category = CASE
      WHEN movement.type = 'INITIAL_FUNDING' AND fund.fund_type = 'INTERNAL_COMPANY' THEN 'BUDGET_FUNDING'
      WHEN movement.type = 'INITIAL_FUNDING' THEN 'OWNER_CONTRIBUTION'
      WHEN movement.type = 'ADDITIONAL_DEPOSIT' AND fund.fund_type = 'INTERNAL_COMPANY' THEN 'ADDITIONAL_FUNDING'
      WHEN movement.type = 'ADDITIONAL_DEPOSIT' THEN 'OWNER_CONTRIBUTION'
      WHEN movement.type = 'RETURN_TO_SOURCE' THEN 'RETURN'
      WHEN movement.type = 'CARRY_FORWARD' THEN 'CARRY_FORWARD'
      ELSE 'ADJUSTMENT'
    END,
    movement.counterparty_name = COALESCE(movement.external_source_name, fund.funding_source_name),
    movement.statement_description = COALESCE(NULLIF(movement.reference, ''), movement.external_source_name, 'Entrada de dinero')
WHERE movement.entry_category IS NULL;
