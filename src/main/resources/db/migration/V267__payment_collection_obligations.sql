CREATE TABLE payment_collection_obligations (
    id BIGINT NOT NULL AUTO_INCREMENT,
    request_id BIGINT NOT NULL,
    company_id BIGINT NOT NULL,
    stripe_invoice_id VARCHAR(255) NOT NULL,
    stripe_subscription_id VARCHAR(255) NOT NULL,
    stripe_customer_id VARCHAR(255) NOT NULL,
    currency CHAR(3) NOT NULL,
    amount_cents BIGINT NOT NULL,
    amount_due_cents BIGINT NOT NULL,
    hosted_invoice_url TEXT NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_collection_obligation_invoice (request_id, stripe_invoice_id),
    KEY idx_collection_obligation_company (company_id, request_id),
    CONSTRAINT fk_collection_obligation_request FOREIGN KEY (request_id) REFERENCES company_payment_requests(id),
    CONSTRAINT fk_collection_obligation_company FOREIGN KEY (company_id) REFERENCES companies(id),
    CONSTRAINT chk_collection_obligation_amount CHECK (amount_cents > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payment_collection_payment_states (
    request_id BIGINT NOT NULL,
    company_id BIGINT NOT NULL,
    selection_json JSON NULL,
    signup_intent_id BIGINT NULL,
    checkout_attempt_no INT NOT NULL DEFAULT 0,
    checkout_attempt_expires_at TIMESTAMP(6) NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (request_id),
    KEY idx_collection_payment_company (company_id, request_id),
    CONSTRAINT fk_collection_payment_request FOREIGN KEY (request_id) REFERENCES company_payment_requests(id),
    CONSTRAINT fk_collection_payment_company FOREIGN KEY (company_id) REFERENCES companies(id),
    CONSTRAINT fk_collection_payment_intent FOREIGN KEY (signup_intent_id) REFERENCES billing_signup_intents(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
