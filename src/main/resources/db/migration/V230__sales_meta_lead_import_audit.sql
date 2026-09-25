CREATE TABLE IF NOT EXISTS sales_meta_lead_imports (
    id BIGINT NOT NULL AUTO_INCREMENT,
    company_id BIGINT NOT NULL,
    meta_page_id VARCHAR(40) NOT NULL,
    meta_form_id VARCHAR(40) NOT NULL,
    meta_lead_id VARCHAR(80) NOT NULL,
    contact_id BIGINT NOT NULL,
    source_created_at DATETIME NULL,
    imported_by_user_id BIGINT NULL,
    imported_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_sales_meta_lead_import_company_lead (company_id, meta_lead_id),
    KEY idx_sales_meta_lead_import_company_contact (company_id, contact_id),
    CONSTRAINT fk_sales_meta_lead_import_company
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_sales_meta_lead_import_contact
        FOREIGN KEY (contact_id) REFERENCES sales_contacts(id) ON DELETE RESTRICT,
    CONSTRAINT fk_sales_meta_lead_import_user
        FOREIGN KEY (imported_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
