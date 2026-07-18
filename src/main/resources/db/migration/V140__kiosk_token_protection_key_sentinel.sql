CREATE TABLE kiosk_security_key_sentinels (
    key_purpose VARCHAR(80) NOT NULL,
    verification_mac CHAR(64) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (key_purpose),
    CONSTRAINT chk_kiosk_security_sentinel_mac
        CHECK (verification_mac REGEXP '^[0-9a-f]{64}$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
