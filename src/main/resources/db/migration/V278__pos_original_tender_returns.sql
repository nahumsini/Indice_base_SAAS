CREATE TABLE pos_returns (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT NOT NULL,
    ticket_id BIGINT NOT NULL,
    shift_id BIGINT NOT NULL,
    sales_record_id BIGINT NOT NULL,
    request_key VARCHAR(100) COLLATE utf8mb4_bin NOT NULL,
    status VARCHAR(24) NOT NULL,
    reason VARCHAR(500) NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    total_amount DECIMAL(19,4) NOT NULL,
    created_by_user_id BIGINT NOT NULL,
    completed_by_user_id BIGINT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    active_ticket_id BIGINT GENERATED ALWAYS AS (CASE WHEN status = 'CANCELLED' THEN NULL ELSE ticket_id END) STORED,
    UNIQUE KEY uq_pos_return_request (company_id, request_key),
    UNIQUE KEY uq_pos_return_active_ticket (company_id, active_ticket_id),
    KEY idx_pos_return_shift (company_id, shift_id, status),
    CONSTRAINT fk_pos_return_company FOREIGN KEY (company_id) REFERENCES companies(id),
    CONSTRAINT fk_pos_return_ticket FOREIGN KEY (ticket_id) REFERENCES pos_tickets(id),
    CONSTRAINT chk_pos_return_status CHECK (status IN ('PREPARED', 'PROCESSING', 'COMPLETED', 'CANCELLED'))
);

CREATE TABLE pos_return_payments (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT NOT NULL,
    return_id BIGINT NOT NULL,
    payment_id BIGINT NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    amount DECIMAL(19,4) NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'PENDING',
    provider_payment_id VARCHAR(255) NULL,
    provider_refund_id VARCHAR(255) NULL,
    provider_request_key VARCHAR(45) NULL,
    evidence_reference VARCHAR(200) NULL,
    confirmed_by_user_id BIGINT NULL,
    confirmed_at TIMESTAMP NULL,
    UNIQUE KEY uq_pos_return_payment (return_id, payment_id),
    UNIQUE KEY uq_pos_return_provider_key (provider_request_key),
    CONSTRAINT fk_pos_return_payment_parent FOREIGN KEY (return_id) REFERENCES pos_returns(id),
    CONSTRAINT fk_pos_return_original_payment FOREIGN KEY (payment_id) REFERENCES pos_payments(id),
    CONSTRAINT chk_pos_return_payment_status CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REJECTED'))
);

CREATE TABLE pos_return_items (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT NOT NULL,
    return_id BIGINT NOT NULL,
    movement_id BIGINT NOT NULL,
    quantity DECIMAL(19,4) NOT NULL,
    unit_cost DECIMAL(19,4) NOT NULL,
    cost_currency VARCHAR(3) NOT NULL,
    UNIQUE KEY uq_pos_return_inventory (return_id, movement_id),
    CONSTRAINT fk_pos_return_item_parent FOREIGN KEY (return_id) REFERENCES pos_returns(id),
    CONSTRAINT fk_pos_return_item_movement FOREIGN KEY (movement_id) REFERENCES sales_inventory_movements(id)
);
