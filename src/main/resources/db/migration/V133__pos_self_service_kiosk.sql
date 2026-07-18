CREATE TABLE IF NOT EXISTS pos_self_service_kiosks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT NOT NULL,
    unit_id BIGINT NULL,
    business_id BIGINT NULL,
    warehouse_id BIGINT NOT NULL,
    cash_register_id BIGINT NOT NULL,
    code VARCHAR(80) NOT NULL,
    name VARCHAR(180) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE',
    expires_at TIMESTAMP NULL,
    public_token_hint VARCHAR(16) NOT NULL,
    show_stock TINYINT(1) NOT NULL DEFAULT 1,
    customer_name_required TINYINT(1) NOT NULL DEFAULT 0,
    max_items_per_ticket INT NOT NULL DEFAULT 30,
    preticket_ttl_minutes INT NOT NULL DEFAULT 120,
    created_by_user_id BIGINT NULL,
    updated_by_user_id BIGINT NULL,
    version BIGINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    UNIQUE KEY uk_pos_self_service_kiosks_code (company_id, code),
    KEY idx_pos_self_service_kiosks_scope (company_id, unit_id, business_id, status),
    KEY idx_pos_self_service_kiosks_register (company_id, cash_register_id),
    CONSTRAINT fk_pos_self_service_kiosks_company
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_pos_self_service_kiosks_warehouse
        FOREIGN KEY (warehouse_id) REFERENCES sales_inventory_warehouses(id) ON DELETE RESTRICT,
    CONSTRAINT fk_pos_self_service_kiosks_register
        FOREIGN KEY (cash_register_id) REFERENCES pos_cash_registers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_pos_self_service_kiosks_created_by
        FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_pos_self_service_kiosks_updated_by
        FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_pos_self_service_kiosks_status
        CHECK (status IN ('ACTIVE', 'DISABLED', 'REVOKED')),
    CONSTRAINT chk_pos_self_service_kiosks_limits
        CHECK (max_items_per_ticket BETWEEN 1 AND 100 AND preticket_ttl_minutes BETWEEN 15 AND 1440)
);

CREATE TABLE IF NOT EXISTS pos_self_service_pretickets (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT NOT NULL,
    kiosk_id BIGINT NOT NULL,
    cash_register_id BIGINT NOT NULL,
    warehouse_id BIGINT NOT NULL,
    preticket_number VARCHAR(80) NOT NULL,
    claim_code VARCHAR(12) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'PENDING',
    currency_code VARCHAR(3) NOT NULL DEFAULT 'MXN',
    customer_name VARCHAR(180) NULL,
    customer_email VARCHAR(180) NULL,
    customer_phone VARCHAR(40) NULL,
    item_count INT NOT NULL,
    subtotal_amount DECIMAL(15,4) NOT NULL DEFAULT 0,
    total_amount DECIMAL(15,4) NOT NULL DEFAULT 0,
    claimed_by_user_id BIGINT NULL,
    claimed_at TIMESTAMP NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_pos_self_service_preticket_number (company_id, preticket_number),
    UNIQUE KEY uk_pos_self_service_claim_code (company_id, claim_code),
    KEY idx_pos_self_service_pending (company_id, cash_register_id, status, expires_at),
    CONSTRAINT fk_pos_self_service_pretickets_company
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_pos_self_service_pretickets_kiosk
        FOREIGN KEY (kiosk_id) REFERENCES pos_self_service_kiosks(id) ON DELETE RESTRICT,
    CONSTRAINT fk_pos_self_service_pretickets_register
        FOREIGN KEY (cash_register_id) REFERENCES pos_cash_registers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_pos_self_service_pretickets_warehouse
        FOREIGN KEY (warehouse_id) REFERENCES sales_inventory_warehouses(id) ON DELETE RESTRICT,
    CONSTRAINT fk_pos_self_service_pretickets_claimed_by
        FOREIGN KEY (claimed_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_pos_self_service_pretickets_status
        CHECK (status IN ('PENDING', 'CLAIMED', 'CANCELLED', 'EXPIRED'))
);

CREATE TABLE IF NOT EXISTS pos_self_service_preticket_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT NOT NULL,
    preticket_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    sku VARCHAR(120) NULL,
    product_name VARCHAR(240) NOT NULL,
    quantity DECIMAL(15,4) NOT NULL,
    unit_price DECIMAL(15,4) NOT NULL,
    line_total DECIMAL(15,4) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_pos_self_service_items_preticket (company_id, preticket_id, sort_order),
    CONSTRAINT fk_pos_self_service_items_company
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_pos_self_service_items_preticket
        FOREIGN KEY (preticket_id) REFERENCES pos_self_service_pretickets(id) ON DELETE CASCADE,
    CONSTRAINT fk_pos_self_service_items_product
        FOREIGN KEY (product_id) REFERENCES sales_products(id) ON DELETE RESTRICT,
    CONSTRAINT chk_pos_self_service_items_values
        CHECK (quantity > 0 AND unit_price >= 0 AND line_total >= 0)
);

CREATE TABLE IF NOT EXISTS pos_self_service_audit_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id VARCHAR(36) NOT NULL,
    company_id BIGINT NOT NULL,
    kiosk_id BIGINT NOT NULL,
    preticket_id BIGINT NULL,
    event_type VARCHAR(80) NOT NULL,
    outcome VARCHAR(24) NOT NULL,
    request_id VARCHAR(128) NULL,
    action_id VARCHAR(36) NULL,
    actor_user_id BIGINT NULL,
    snapshot_json JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    retain_until TIMESTAMP NOT NULL,
    UNIQUE KEY uk_pos_self_service_audit_event (event_id),
    KEY idx_pos_self_service_audit_kiosk (company_id, kiosk_id, created_at),
    KEY idx_pos_self_service_audit_retention (retain_until),
    CONSTRAINT fk_pos_self_service_audit_company
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_pos_self_service_audit_kiosk
        FOREIGN KEY (kiosk_id) REFERENCES pos_self_service_kiosks(id) ON DELETE RESTRICT,
    CONSTRAINT fk_pos_self_service_audit_preticket
        FOREIGN KEY (preticket_id) REFERENCES pos_self_service_pretickets(id) ON DELETE SET NULL,
    CONSTRAINT fk_pos_self_service_audit_actor
        FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);
