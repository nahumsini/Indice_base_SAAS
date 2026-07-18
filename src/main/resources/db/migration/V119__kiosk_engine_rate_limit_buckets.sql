CREATE TABLE IF NOT EXISTS kiosk_engine_rate_limit_buckets (
    limit_type VARCHAR(40) NOT NULL,
    scope_hash CHAR(64) NOT NULL,
    window_started_at TIMESTAMP(6) NOT NULL,
    request_count INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP(6) NOT NULL,
    PRIMARY KEY (limit_type, scope_hash),
    KEY idx_kiosk_engine_rate_limit_updated (updated_at)
);
