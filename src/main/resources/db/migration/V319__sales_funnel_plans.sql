CREATE TABLE sales_funnels (
    company_id BIGINT NOT NULL,
    id CHAR(36) NOT NULL,
    name VARCHAR(180) NOT NULL,
    objective VARCHAR(1000) NOT NULL,
    audience VARCHAR(1000) NOT NULL,
    channel VARCHAR(40) NOT NULL,
    notes TEXT NOT NULL,
    stages_json JSON NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
    version BIGINT NOT NULL,
    created_by BIGINT NOT NULL,
    updated_by BIGINT NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (company_id, id),
    KEY idx_sales_funnel_list (company_id, status, updated_at),
    CONSTRAINT fk_sales_funnel_company FOREIGN KEY (company_id) REFERENCES companies(id),
    CONSTRAINT fk_sales_funnel_creator FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT fk_sales_funnel_editor FOREIGN KEY (updated_by) REFERENCES users(id),
    CONSTRAINT chk_sales_funnel_status CHECK (status IN ('DRAFT', 'PLANNED', 'ARCHIVED'))
);
CREATE TABLE sales_funnel_audit (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT NOT NULL,
    funnel_id CHAR(36) NOT NULL,
    actor_user_id BIGINT NOT NULL,
    version BIGINT NOT NULL,
    status VARCHAR(24) NOT NULL,
    occurred_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_sales_funnel_audit_plan FOREIGN KEY (company_id, funnel_id) REFERENCES sales_funnels(company_id, id),
    CONSTRAINT fk_sales_funnel_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users(id)
);
