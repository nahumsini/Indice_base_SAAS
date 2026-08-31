CREATE TABLE product_analytics_sessions (
    session_key CHAR(36) NOT NULL,
    surface VARCHAR(16) NOT NULL,
    company_id BIGINT NULL,
    user_id BIGINT NULL,
    visitor_key_hash CHAR(64) NULL,
    locale VARCHAR(16) NULL,
    device_type VARCHAR(16) NOT NULL DEFAULT 'DESKTOP',
    source_name VARCHAR(100) NULL,
    medium_name VARCHAR(100) NULL,
    campaign_name VARCHAR(150) NULL,
    referrer_host VARCHAR(255) NULL,
    started_at DATETIME(6) NOT NULL,
    last_seen_at DATETIME(6) NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (session_key),
    KEY idx_product_analytics_sessions_surface_seen (surface, last_seen_at),
    KEY idx_product_analytics_sessions_company_seen (company_id, last_seen_at),
    KEY idx_product_analytics_sessions_user_seen (user_id, last_seen_at),
    KEY idx_product_analytics_sessions_visitor_seen (visitor_key_hash, last_seen_at),
    CONSTRAINT fk_product_analytics_sessions_company
        FOREIGN KEY (company_id) REFERENCES companies(id),
    CONSTRAINT fk_product_analytics_sessions_user
        FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT chk_product_analytics_sessions_surface
        CHECK (surface IN ('APP', 'WEB')),
    CONSTRAINT chk_product_analytics_sessions_identity
        CHECK (
            (surface = 'APP' AND company_id IS NOT NULL AND user_id IS NOT NULL AND visitor_key_hash IS NULL)
            OR
            (surface = 'WEB' AND company_id IS NULL AND user_id IS NULL AND visitor_key_hash IS NOT NULL)
        )
);

CREATE TABLE product_analytics_page_usage (
    id BIGINT NOT NULL AUTO_INCREMENT,
    session_key CHAR(36) NOT NULL,
    usage_date DATE NOT NULL,
    route_key VARCHAR(120) NOT NULL,
    section_key VARCHAR(120) NOT NULL DEFAULT '',
    view_count INT NOT NULL DEFAULT 0,
    active_seconds INT NOT NULL DEFAULT 0,
    interaction_count INT NOT NULL DEFAULT 0,
    conversion_count INT NOT NULL DEFAULT 0,
    first_observed_at DATETIME(6) NOT NULL,
    last_observed_at DATETIME(6) NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_product_analytics_page_usage (session_key, usage_date, route_key, section_key),
    KEY idx_product_analytics_page_usage_date_route (usage_date, route_key, section_key),
    CONSTRAINT fk_product_analytics_page_usage_session
        FOREIGN KEY (session_key) REFERENCES product_analytics_sessions(session_key) ON DELETE CASCADE,
    CONSTRAINT chk_product_analytics_page_usage_nonnegative
        CHECK (
            view_count >= 0 AND active_seconds >= 0
            AND interaction_count >= 0 AND conversion_count >= 0
        )
);
