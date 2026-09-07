ALTER TABLE finance_receivable_payments
  ADD COLUMN receipt_object_key VARCHAR(512) NULL,
  ADD COLUMN receipt_file_name VARCHAR(255) NULL,
  ADD COLUMN receipt_mime_type VARCHAR(100) NULL,
  ADD COLUMN receipt_size_bytes BIGINT NULL,
  ADD UNIQUE KEY uq_receivable_payment_receipt (company_id, receipt_object_key),
  ADD CONSTRAINT chk_receivable_receipt_size CHECK (receipt_size_bytes IS NULL OR receipt_size_bytes BETWEEN 1 AND 10485760);
