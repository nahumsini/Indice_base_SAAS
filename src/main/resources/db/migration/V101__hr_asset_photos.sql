CREATE TABLE IF NOT EXISTS user_asset_photos (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT NOT NULL,
    asset_id BIGINT NOT NULL,
    file_name VARCHAR(180) NOT NULL,
    mime_type VARCHAR(80) NOT NULL,
    size_bytes INT NOT NULL DEFAULT 0,
    data_url MEDIUMTEXT NOT NULL,
    caption VARCHAR(240) NULL,
    uploaded_by_user_id BIGINT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_asset_photos_company
        FOREIGN KEY (company_id) REFERENCES companies(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_user_asset_photos_asset
        FOREIGN KEY (asset_id) REFERENCES user_assets(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_user_asset_photos_uploaded_by
        FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id)
        ON DELETE SET NULL,
    CONSTRAINT chk_user_asset_photos_mime_type
        CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp', 'image/gif')),
    CONSTRAINT chk_user_asset_photos_size
        CHECK (size_bytes >= 0 AND size_bytes <= 2500000)
);

SET @create_user_asset_photos_company_asset_created_idx := (
    SELECT IF(
        COUNT(*) = 0,
        'CREATE INDEX idx_user_asset_photos_company_asset_created ON user_asset_photos (company_id, asset_id, created_at)',
        'SELECT 1'
    )
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'user_asset_photos'
      AND index_name = 'idx_user_asset_photos_company_asset_created'
);

PREPARE stmt FROM @create_user_asset_photos_company_asset_created_idx;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @create_user_asset_photos_asset_idx := (
    SELECT IF(
        COUNT(*) = 0,
        'CREATE INDEX idx_user_asset_photos_asset ON user_asset_photos (asset_id)',
        'SELECT 1'
    )
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'user_asset_photos'
      AND index_name = 'idx_user_asset_photos_asset'
);

PREPARE stmt FROM @create_user_asset_photos_asset_idx;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @create_user_asset_photos_uploaded_by_idx := (
    SELECT IF(
        COUNT(*) = 0,
        'CREATE INDEX idx_user_asset_photos_uploaded_by ON user_asset_photos (uploaded_by_user_id)',
        'SELECT 1'
    )
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'user_asset_photos'
      AND index_name = 'idx_user_asset_photos_uploaded_by'
);

PREPARE stmt FROM @create_user_asset_photos_uploaded_by_idx;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
