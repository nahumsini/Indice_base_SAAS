ALTER TABLE sales_commission_cuts
  ADD COLUMN preferred_currency CHAR(3) NULL AFTER total_amount,
  ADD COLUMN preferred_total_amount DECIMAL(20,6) NULL AFTER preferred_currency,
  ADD COLUMN exchange_rate_mode VARCHAR(20) NULL AFTER preferred_total_amount,
  ADD COLUMN exchange_rate_effective_date DATE NULL AFTER exchange_rate_mode,
  ADD COLUMN exchange_rate_source VARCHAR(160) NULL AFTER exchange_rate_effective_date,
  ADD COLUMN exchange_rates_snapshot_json JSON NULL AFTER exchange_rate_source,
  ADD COLUMN native_totals_snapshot_json JSON NULL AFTER exchange_rates_snapshot_json,
  ADD COLUMN currency_snapshot_partial BOOLEAN NOT NULL DEFAULT FALSE AFTER native_totals_snapshot_json,
  ADD COLUMN currency_snapshot_excluded_records INT NOT NULL DEFAULT 0 AFTER currency_snapshot_partial;

ALTER TABLE sales_commission_cut_schedules
  ADD COLUMN preferred_currency CHAR(3) NOT NULL DEFAULT 'MXN' AFTER cadence;
