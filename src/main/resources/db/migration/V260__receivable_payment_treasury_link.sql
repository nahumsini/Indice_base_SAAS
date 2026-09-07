-- New collections identify their native-currency destination and retry key.
-- Historical payments remain untouched and never generate new cash on migration.
ALTER TABLE finance_receivable_payments
  ADD COLUMN payment_account_id BIGINT NULL,
  ADD COLUMN idempotency_key VARCHAR(120) NULL,
  ADD UNIQUE KEY uq_receivable_payment_idempotency (company_id, idempotency_key),
  ADD KEY idx_receivable_payment_destination (payment_account_id),
  ADD CONSTRAINT fk_receivable_payment_destination
    FOREIGN KEY (payment_account_id) REFERENCES finance_payment_accounts(id) ON DELETE RESTRICT;
