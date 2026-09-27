-- Sales is the commercial summary; POS owns the operation behind a POS summary.
ALTER TABLE sales_records
    ADD COLUMN source_type VARCHAR(24) NOT NULL DEFAULT 'SALES',
    ADD UNIQUE KEY uq_sales_records_company_id (company_id, id);

UPDATE sales_records sale
SET source_type = 'POS'
WHERE EXISTS (
    SELECT 1 FROM pos_tickets ticket
    WHERE ticket.company_id = sale.company_id AND ticket.sales_record_id = sale.id
) OR JSON_UNQUOTE(JSON_EXTRACT(sale.metadata_json, '$.source')) = 'POS';

-- Fail migration on inconsistent historical links; never discard financial history.
ALTER TABLE pos_tickets
    ADD UNIQUE KEY uq_pos_ticket_sales_record (sales_record_id),
    ADD CONSTRAINT fk_pos_ticket_company_sale
        FOREIGN KEY (company_id, sales_record_id)
        REFERENCES sales_records (company_id, id);

CREATE TABLE pos_checkout_requests (
    company_id BIGINT NOT NULL,
    request_key VARCHAR(100) COLLATE utf8mb4_bin NOT NULL,
    user_id BIGINT NOT NULL,
    request_hash CHAR(64) NOT NULL,
    response_json JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (company_id, request_key),
    CONSTRAINT fk_pos_checkout_request_company FOREIGN KEY (company_id) REFERENCES companies (id)
);
