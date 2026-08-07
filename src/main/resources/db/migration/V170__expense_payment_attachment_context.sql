ALTER TABLE finance_expense_attachments
    ADD COLUMN payment_amount DECIMAL(19, 4) NULL AFTER uploaded_by_user_id,
    ADD COLUMN payment_date DATE NULL AFTER payment_amount,
    ADD COLUMN payment_account_id BIGINT NULL AFTER payment_date,
    ADD INDEX idx_finance_expense_attachments_payment (company_id, expense_id, payment_date),
    ADD CONSTRAINT fk_finance_expense_attachment_payment_account
        FOREIGN KEY (payment_account_id) REFERENCES finance_payment_accounts(id) ON DELETE SET NULL;
