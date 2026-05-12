SET @schema_name = DATABASE();

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'processes'
          AND COLUMN_NAME = 'unit_id'
    ),
    'SELECT 1',
    'ALTER TABLE processes ADD COLUMN unit_id BIGINT NULL AFTER unit_name'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'processes'
          AND COLUMN_NAME = 'business_id'
    ),
    'SELECT 1',
    'ALTER TABLE processes ADD COLUMN business_id BIGINT NULL AFTER business_name'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'processes'
          AND COLUMN_NAME = 'creator_user_company_id'
    ),
    'SELECT 1',
    'ALTER TABLE processes ADD COLUMN creator_user_company_id BIGINT NULL AFTER creator_user_id'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'processes'
          AND COLUMN_NAME = 'responsible_user_company_id'
    ),
    'SELECT 1',
    'ALTER TABLE processes ADD COLUMN responsible_user_company_id BIGINT NULL AFTER responsible_name'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE processes proc
LEFT JOIN units unit_record ON unit_record.company_id = proc.company_id
    AND LOWER(TRIM(unit_record.name)) = LOWER(TRIM(proc.unit_name COLLATE utf8mb4_unicode_ci))
SET proc.unit_id = unit_record.id
WHERE proc.unit_id IS NULL
  AND proc.unit_name IS NOT NULL
  AND unit_record.id IS NOT NULL;

UPDATE processes proc
LEFT JOIN businesses business_record ON business_record.company_id = proc.company_id
    AND LOWER(TRIM(business_record.name)) = LOWER(TRIM(proc.business_name COLLATE utf8mb4_unicode_ci))
    AND (proc.unit_id IS NULL OR business_record.unit_id = proc.unit_id OR business_record.unit_id IS NULL)
SET proc.business_id = business_record.id
WHERE proc.business_id IS NULL
  AND proc.business_name IS NOT NULL
  AND business_record.id IS NOT NULL;

UPDATE processes proc
LEFT JOIN businesses business_record ON business_record.id = proc.business_id
    AND business_record.company_id = proc.company_id
SET proc.unit_id = business_record.unit_id
WHERE proc.unit_id IS NULL
  AND business_record.unit_id IS NOT NULL;

UPDATE processes proc
LEFT JOIN user_companies creator_user_company ON creator_user_company.company_id = proc.company_id
    AND creator_user_company.user_id = proc.creator_user_id
    AND LOWER(COALESCE(creator_user_company.status, 'active')) IN ('active', 'activo')
SET proc.creator_user_company_id = creator_user_company.id
WHERE proc.creator_user_company_id IS NULL
  AND proc.creator_user_id IS NOT NULL
  AND creator_user_company.id IS NOT NULL;

UPDATE processes proc
LEFT JOIN user_companies responsible_user_company ON responsible_user_company.company_id = proc.company_id
    AND LOWER(COALESCE(responsible_user_company.status, 'active')) IN ('active', 'activo')
LEFT JOIN users responsible_user ON responsible_user.id = responsible_user_company.user_id
    AND (
        LOWER(TRIM(responsible_user.full_name)) = LOWER(TRIM(proc.responsible_name))
        OR LOWER(TRIM(responsible_user.email)) = LOWER(TRIM(proc.responsible_name))
    )
SET proc.responsible_user_company_id = responsible_user_company.id
WHERE proc.responsible_user_company_id IS NULL
  AND proc.responsible_name IS NOT NULL
  AND responsible_user_company.id IS NOT NULL
  AND responsible_user.id IS NOT NULL;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'processes'
          AND INDEX_NAME = 'idx_processes_company_unit'
    ),
    'SELECT 1',
    'ALTER TABLE processes ADD INDEX idx_processes_company_unit (company_id, unit_id)'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'processes'
          AND INDEX_NAME = 'idx_processes_company_business'
    ),
    'SELECT 1',
    'ALTER TABLE processes ADD INDEX idx_processes_company_business (company_id, business_id)'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'processes'
          AND INDEX_NAME = 'idx_processes_creator_user_company'
    ),
    'SELECT 1',
    'ALTER TABLE processes ADD INDEX idx_processes_creator_user_company (creator_user_company_id)'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'processes'
          AND INDEX_NAME = 'idx_processes_responsible_user_company'
    ),
    'SELECT 1',
    'ALTER TABLE processes ADD INDEX idx_processes_responsible_user_company (responsible_user_company_id)'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'processes'
          AND CONSTRAINT_NAME = 'fk_processes_unit'
    ),
    'SELECT 1',
    'ALTER TABLE processes ADD CONSTRAINT fk_processes_unit FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'processes'
          AND CONSTRAINT_NAME = 'fk_processes_business'
    ),
    'SELECT 1',
    'ALTER TABLE processes ADD CONSTRAINT fk_processes_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'processes'
          AND CONSTRAINT_NAME = 'fk_processes_creator_user_company'
    ),
    'SELECT 1',
    'ALTER TABLE processes ADD CONSTRAINT fk_processes_creator_user_company FOREIGN KEY (creator_user_company_id) REFERENCES user_companies(id) ON DELETE SET NULL'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'processes'
          AND CONSTRAINT_NAME = 'fk_processes_responsible_user_company'
    ),
    'SELECT 1',
    'ALTER TABLE processes ADD CONSTRAINT fk_processes_responsible_user_company FOREIGN KEY (responsible_user_company_id) REFERENCES user_companies(id) ON DELETE SET NULL'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
