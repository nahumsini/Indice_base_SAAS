-- Additive retry evidence. Existing expenses, amounts, balances and origins are unchanged.
CREATE TABLE finance_expense_import_batches (
    id BIGINT NOT NULL AUTO_INCREMENT,
    company_id BIGINT NOT NULL,
    request_key VARCHAR(80) NOT NULL,
    request_hash CHAR(64) NOT NULL,
    created_by_user_id BIGINT NOT NULL,
    expense_ids_json JSON NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_expense_import_company_request (company_id, request_key),
    CONSTRAINT fk_expense_import_company FOREIGN KEY (company_id) REFERENCES companies(id),
    CONSTRAINT fk_expense_import_user FOREIGN KEY (created_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
