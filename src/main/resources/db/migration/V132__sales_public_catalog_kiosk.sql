CREATE TABLE IF NOT EXISTS sales_public_catalogs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT NOT NULL,
    unit_id BIGINT NULL,
    business_id BIGINT NULL,
    code VARCHAR(80) NOT NULL,
    name VARCHAR(180) NOT NULL,
    title VARCHAR(220) NOT NULL,
    description VARCHAR(2000) NULL,
    cover_image_url VARCHAR(1200) NULL,
    contact_cta_label VARCHAR(120) NOT NULL DEFAULT 'Contactar',
    contact_method VARCHAR(24) NOT NULL DEFAULT 'whatsapp',
    contact_value VARCHAR(500) NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE',
    expires_at TIMESTAMP NULL,
    public_token_hint VARCHAR(16) NOT NULL,
    show_prices TINYINT(1) NOT NULL DEFAULT 1,
    show_wholesale_prices TINYINT(1) NOT NULL DEFAULT 0,
    show_stock_status TINYINT(1) NOT NULL DEFAULT 1,
    show_item_type_badges TINYINT(1) NOT NULL DEFAULT 1,
    show_categories TINYINT(1) NOT NULL DEFAULT 1,
    allow_cart TINYINT(1) NOT NULL DEFAULT 1,
    allow_purchase_request TINYINT(1) NOT NULL DEFAULT 1,
    created_by_user_id BIGINT NULL,
    updated_by_user_id BIGINT NULL,
    version BIGINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    UNIQUE KEY uk_sales_public_catalogs_code (company_id, code),
    KEY idx_sales_public_catalogs_scope (company_id, unit_id, business_id, status),
    CONSTRAINT fk_sales_public_catalogs_company
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_sales_public_catalogs_unit
        FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL,
    CONSTRAINT fk_sales_public_catalogs_business
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL,
    CONSTRAINT fk_sales_public_catalogs_created_by
        FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_sales_public_catalogs_updated_by
        FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_sales_public_catalogs_status
        CHECK (status IN ('ACTIVE', 'DISABLED', 'REVOKED')),
    CONSTRAINT chk_sales_public_catalogs_contact
        CHECK (contact_method IN ('whatsapp', 'email', 'phone', 'website'))
);

CREATE TABLE IF NOT EXISTS sales_public_catalog_products (
    catalog_id BIGINT NOT NULL,
    company_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (catalog_id, product_id),
    KEY idx_sales_public_catalog_products_product (company_id, product_id),
    CONSTRAINT fk_sales_public_catalog_products_catalog
        FOREIGN KEY (catalog_id) REFERENCES sales_public_catalogs(id) ON DELETE CASCADE,
    CONSTRAINT fk_sales_public_catalog_products_company
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_sales_public_catalog_products_product
        FOREIGN KEY (product_id) REFERENCES sales_products(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS sales_public_catalog_requests (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT NOT NULL,
    catalog_id BIGINT NOT NULL,
    request_number VARCHAR(80) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'SUBMITTED',
    customer_name VARCHAR(180) NOT NULL,
    contact_value VARCHAR(240) NOT NULL,
    preferred_contact_method VARCHAR(24) NOT NULL,
    message VARCHAR(4000) NULL,
    currency_code VARCHAR(3) NOT NULL DEFAULT 'MXN',
    item_count INT NOT NULL DEFAULT 0,
    estimated_total DECIMAL(15,4) NOT NULL DEFAULT 0,
    reviewed_by_user_id BIGINT NULL,
    reviewed_at TIMESTAMP NULL,
    review_note VARCHAR(4000) NULL,
    personal_data_purged_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_sales_public_catalog_request_number (company_id, request_number),
    KEY idx_sales_public_catalog_requests_review (company_id, status, created_at),
    KEY idx_sales_public_catalog_requests_catalog (company_id, catalog_id, created_at),
    CONSTRAINT fk_sales_public_catalog_requests_company
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_sales_public_catalog_requests_catalog
        FOREIGN KEY (catalog_id) REFERENCES sales_public_catalogs(id) ON DELETE RESTRICT,
    CONSTRAINT fk_sales_public_catalog_requests_reviewed_by
        FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_sales_public_catalog_requests_status
        CHECK (status IN ('SUBMITTED', 'IN_REVIEW', 'ACCEPTED', 'REJECTED', 'CONVERTED')),
    CONSTRAINT chk_sales_public_catalog_requests_contact
        CHECK (preferred_contact_method IN ('whatsapp', 'email', 'phone', 'website'))
);

CREATE TABLE IF NOT EXISTS sales_public_catalog_request_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT NOT NULL,
    request_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    sku VARCHAR(120) NULL,
    product_name VARCHAR(240) NOT NULL,
    quantity DECIMAL(15,4) NOT NULL,
    unit_price DECIMAL(15,4) NOT NULL,
    line_total DECIMAL(15,4) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_sales_public_catalog_request_items (company_id, request_id, sort_order),
    CONSTRAINT fk_sales_public_catalog_request_items_company
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_sales_public_catalog_request_items_request
        FOREIGN KEY (request_id) REFERENCES sales_public_catalog_requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_sales_public_catalog_request_items_product
        FOREIGN KEY (product_id) REFERENCES sales_products(id) ON DELETE RESTRICT,
    CONSTRAINT chk_sales_public_catalog_request_item_values
        CHECK (quantity > 0 AND unit_price >= 0 AND line_total >= 0)
);

CREATE TABLE IF NOT EXISTS sales_public_catalog_audit_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id VARCHAR(36) NOT NULL,
    company_id BIGINT NOT NULL,
    catalog_id BIGINT NOT NULL,
    request_id BIGINT NULL,
    event_type VARCHAR(80) NOT NULL,
    outcome VARCHAR(24) NOT NULL,
    request_correlation_id VARCHAR(128) NULL,
    action_id VARCHAR(36) NULL,
    actor_user_id BIGINT NULL,
    snapshot_json JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    retain_until TIMESTAMP NOT NULL,
    UNIQUE KEY uk_sales_public_catalog_audit_event (event_id),
    KEY idx_sales_public_catalog_audit_catalog (company_id, catalog_id, created_at),
    KEY idx_sales_public_catalog_audit_retention (retain_until),
    CONSTRAINT fk_sales_public_catalog_audit_company
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_sales_public_catalog_audit_catalog
        FOREIGN KEY (catalog_id) REFERENCES sales_public_catalogs(id) ON DELETE RESTRICT,
    CONSTRAINT fk_sales_public_catalog_audit_request
        FOREIGN KEY (request_id) REFERENCES sales_public_catalog_requests(id) ON DELETE SET NULL,
    CONSTRAINT fk_sales_public_catalog_audit_actor
        FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);
