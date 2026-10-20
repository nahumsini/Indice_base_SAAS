CREATE TABLE sales_content_calendars (
    company_id BIGINT NOT NULL,
    funnel_id CHAR(36) NOT NULL,
    content_json JSON NOT NULL,
    version BIGINT NOT NULL,
    last_mutation_id CHAR(36) NOT NULL,
    content_digest CHAR(64) NOT NULL,
    updated_by BIGINT NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (company_id, funnel_id),
    CONSTRAINT fk_content_calendar_funnel FOREIGN KEY (company_id, funnel_id) REFERENCES sales_funnels(company_id, id),
    CONSTRAINT fk_content_calendar_actor FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE TABLE sales_content_calendar_audit (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT NOT NULL,
    funnel_id CHAR(36) NOT NULL,
    actor_user_id BIGINT NOT NULL,
    version BIGINT NOT NULL,
    entry_count INT NOT NULL,
    occurred_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_content_calendar_audit_owner FOREIGN KEY (company_id, funnel_id) REFERENCES sales_content_calendars(company_id, funnel_id)
);
