-- Preserve original payment evidence; a reversal only changes its effectiveness.
ALTER TABLE finance_expense_payments
  ADD COLUMN reversed_at TIMESTAMP(6) NULL,
  ADD COLUMN reversed_by_user_id BIGINT NULL,
  ADD COLUMN reversal_reason VARCHAR(500) NULL;
