CREATE TABLE IF NOT EXISTS finance_expense_attachments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT NOT NULL,
    expense_id BIGINT NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(120) NOT NULL,
    size_bytes BIGINT NOT NULL,
    object_key VARCHAR(700) NOT NULL,
    uploaded_by_user_id BIGINT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    version BIGINT NOT NULL DEFAULT 0,
    custom_fields_json JSON NULL,
    metadata_json JSON NULL,
    INDEX idx_finance_expense_attachments_company (company_id),
    INDEX idx_finance_expense_attachments_expense (company_id, expense_id),
    INDEX idx_finance_expense_attachments_uploaded_by (uploaded_by_user_id),
    CONSTRAINT fk_finance_expense_attachments_expense
        FOREIGN KEY (expense_id) REFERENCES finance_expenses(id)
);
