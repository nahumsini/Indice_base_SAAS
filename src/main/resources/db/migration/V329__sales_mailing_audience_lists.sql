CREATE TABLE sales_mailing_audience_lists (
    id CHAR(36) NOT NULL,
    company_id BIGINT NOT NULL,
    name VARCHAR(180) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    version BIGINT NOT NULL DEFAULT 1,
    created_by BIGINT NOT NULL,
    updated_by BIGINT NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (company_id,id),
    KEY idx_mailing_lists_company_status (company_id,status,name),
    CONSTRAINT fk_mailing_lists_company FOREIGN KEY (company_id) REFERENCES companies(id)
);
CREATE TABLE sales_mailing_audience_members (
    company_id BIGINT NOT NULL,
    list_id CHAR(36) NOT NULL,
    contact_id BIGINT NOT NULL,
    PRIMARY KEY (company_id,list_id,contact_id),
    CONSTRAINT fk_mailing_audience_list FOREIGN KEY (company_id,list_id) REFERENCES sales_mailing_audience_lists(company_id,id),
    CONSTRAINT fk_mailing_audience_contact FOREIGN KEY (contact_id) REFERENCES sales_contacts(id)
);
CREATE TABLE sales_mailing_audience_events (
    id BIGINT NOT NULL AUTO_INCREMENT,
    company_id BIGINT NOT NULL,
    list_id CHAR(36) NOT NULL,
    actor_user_id BIGINT NOT NULL,
    action VARCHAR(30) NOT NULL,
    version BIGINT NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_mailing_audience_events (company_id,list_id),
    CONSTRAINT fk_mailing_audience_event_list FOREIGN KEY (company_id,list_id) REFERENCES sales_mailing_audience_lists(company_id,id)
);
CREATE INDEX idx_mailing_deliveries_contact ON sales_mailing_deliveries(company_id,contact_id,campaign_id);
