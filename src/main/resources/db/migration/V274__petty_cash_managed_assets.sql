ALTER TABLE finance_petty_cash_funds ADD COLUMN managed_assets_json JSON NULL;
ALTER TABLE finance_petty_cash_statements ADD COLUMN managed_assets_snapshot_json JSON NULL;

UPDATE finance_petty_cash_funds
SET managed_assets_json = CASE
  WHEN NULLIF(TRIM(managed_asset_type), '') IS NOT NULL OR NULLIF(TRIM(managed_asset_name), '') IS NOT NULL
    OR NULLIF(TRIM(managed_asset_reference), '') IS NOT NULL
  THEN JSON_ARRAY(JSON_OBJECT('type', managed_asset_type, 'name', managed_asset_name, 'reference', managed_asset_reference))
  ELSE JSON_ARRAY() END;

-- Backfill each cut from its own historical identity, never from today's fund configuration.
UPDATE finance_petty_cash_statements
SET managed_assets_snapshot_json = CASE
  WHEN NULLIF(TRIM(managed_asset_type_snapshot), '') IS NOT NULL OR NULLIF(TRIM(managed_asset_name_snapshot), '') IS NOT NULL
    OR NULLIF(TRIM(managed_asset_reference_snapshot), '') IS NOT NULL
  THEN JSON_ARRAY(JSON_OBJECT('type', managed_asset_type_snapshot, 'name', managed_asset_name_snapshot, 'reference', managed_asset_reference_snapshot))
  ELSE JSON_ARRAY() END;
