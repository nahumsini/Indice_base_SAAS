CREATE TABLE IF NOT EXISTS business_exchange_rate_daily_snapshots (
  rate_date DATE NOT NULL,
  base_currency VARCHAR(3) NOT NULL,
  response_payload LONGTEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (rate_date, base_currency)
);

