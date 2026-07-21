CREATE TABLE billing_catalog_versions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    version_code VARCHAR(80) NOT NULL,
    status VARCHAR(20) NOT NULL,
    effective_from TIMESTAMP NULL,
    effective_to TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_billing_catalog_versions_code (version_code),
    KEY idx_billing_catalog_versions_status (status, effective_from)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE billing_catalog_products (
    id BIGINT NOT NULL AUTO_INCREMENT,
    catalog_version_id BIGINT NOT NULL,
    product_code VARCHAR(80) NOT NULL,
    display_name VARCHAR(160) NOT NULL,
    product_type VARCHAR(24) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_billing_catalog_products_version_code (catalog_version_id, product_code),
    KEY idx_billing_catalog_products_active (catalog_version_id, active, sort_order),
    CONSTRAINT fk_billing_catalog_products_version
        FOREIGN KEY (catalog_version_id) REFERENCES billing_catalog_versions (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE billing_product_capabilities (
    id BIGINT NOT NULL AUTO_INCREMENT,
    product_id BIGINT NOT NULL,
    capability_code VARCHAR(80) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_billing_product_capabilities_product_code (product_id, capability_code),
    KEY idx_billing_product_capabilities_code (capability_code),
    CONSTRAINT fk_billing_product_capabilities_product
        FOREIGN KEY (product_id) REFERENCES billing_catalog_products (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE billing_capability_aliases (
    id BIGINT NOT NULL AUTO_INCREMENT,
    catalog_version_id BIGINT NOT NULL,
    alias_code VARCHAR(80) NOT NULL,
    canonical_code VARCHAR(80) NOT NULL,
    compatibility_note VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_billing_capability_aliases_version_alias (catalog_version_id, alias_code),
    KEY idx_billing_capability_aliases_canonical (catalog_version_id, canonical_code),
    CONSTRAINT fk_billing_capability_aliases_version
        FOREIGN KEY (catalog_version_id) REFERENCES billing_catalog_versions (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO billing_catalog_versions (version_code, status, effective_from)
VALUES ('2026.07-premium-v1', 'ACTIVE', CURRENT_TIMESTAMP);

INSERT INTO billing_catalog_products (
    catalog_version_id,
    product_code,
    display_name,
    product_type,
    sort_order
)
SELECT id, 'core_platform', 'Núcleo Índice', 'CORE', 0
FROM billing_catalog_versions
WHERE version_code = '2026.07-premium-v1'
UNION ALL
SELECT id, 'basic_hr', 'Recursos Humanos', 'BASIC', 10
FROM billing_catalog_versions
WHERE version_code = '2026.07-premium-v1'
UNION ALL
SELECT id, 'basic_process_tasks', 'Tareas y Procesos', 'BASIC', 20
FROM billing_catalog_versions
WHERE version_code = '2026.07-premium-v1'
UNION ALL
SELECT id, 'basic_expenses', 'Expenses + Caja Chica', 'BASIC', 30
FROM billing_catalog_versions
WHERE version_code = '2026.07-premium-v1'
UNION ALL
SELECT id, 'basic_pos_inventory', 'Punto de Venta + Inventarios', 'BASIC', 40
FROM billing_catalog_versions
WHERE version_code = '2026.07-premium-v1'
UNION ALL
SELECT id, 'basic_sales_inventory', 'Ventas + Inventarios', 'BASIC', 50
FROM billing_catalog_versions
WHERE version_code = '2026.07-premium-v1'
UNION ALL
SELECT id, 'basic_receivables', 'Cartera', 'BASIC', 60
FROM billing_catalog_versions
WHERE version_code = '2026.07-premium-v1';

INSERT INTO billing_product_capabilities (product_id, capability_code)
SELECT p.id, capabilities.capability_code
FROM billing_catalog_products p
JOIN (
    SELECT 'core_platform' AS product_code, 'dashboard' AS capability_code
    UNION ALL SELECT 'core_platform', 'config_center'
    UNION ALL SELECT 'core_platform', 'kpis'
    UNION ALL SELECT 'core_platform', 'security'
    UNION ALL SELECT 'core_platform', 'billing'
    UNION ALL SELECT 'basic_hr', 'human_resources'
    UNION ALL SELECT 'basic_process_tasks', 'processes'
    UNION ALL SELECT 'basic_expenses', 'expenses'
    UNION ALL SELECT 'basic_expenses', 'petty_cash'
    UNION ALL SELECT 'basic_pos_inventory', 'pos'
    UNION ALL SELECT 'basic_pos_inventory', 'inventory'
    UNION ALL SELECT 'basic_sales_inventory', 'sales'
    UNION ALL SELECT 'basic_sales_inventory', 'inventory'
    UNION ALL SELECT 'basic_receivables', 'receivables'
) capabilities ON capabilities.product_code = p.product_code
JOIN billing_catalog_versions v ON v.id = p.catalog_version_id
WHERE v.version_code = '2026.07-premium-v1';

INSERT INTO billing_capability_aliases (
    catalog_version_id,
    alias_code,
    canonical_code,
    compatibility_note
)
SELECT v.id, aliases.alias_code, aliases.canonical_code, aliases.compatibility_note
FROM billing_catalog_versions v
JOIN (
    SELECT 'home_panel' AS alias_code, 'config_center' AS canonical_code, 'Compatibilidad con Panel Inicial' AS compatibility_note
    UNION ALL SELECT 'panel_inicial', 'config_center', 'Compatibilidad en español'
    UNION ALL SELECT 'panelinicial', 'config_center', 'Compatibilidad histórica'
    UNION ALL SELECT 'configcenter', 'config_center', 'Compatibilidad histórica'
    UNION ALL SELECT 'humanresources', 'human_resources', 'Compatibilidad histórica'
    UNION ALL SELECT 'caja_chica', 'petty_cash', 'Compatibilidad en español'
    UNION ALL SELECT 'point_of_sale', 'pos', 'Compatibilidad histórica'
    UNION ALL SELECT 'punto_de_venta', 'pos', 'Compatibilidad en español'
    UNION ALL SELECT 'punto_venta', 'pos', 'Compatibilidad histórica'
    UNION ALL SELECT 'crm', 'sales', 'Slug técnico actual del módulo Ventas'
    UNION ALL SELECT 'cartera', 'receivables', 'Compatibilidad en español'
    UNION ALL SELECT 'accounts_receivable', 'receivables', 'Compatibilidad histórica'
    UNION ALL SELECT 'accounts_receivables', 'receivables', 'Compatibilidad histórica'
    UNION ALL SELECT 'process_tasks', 'processes', 'Compatibilidad histórica'
    UNION ALL SELECT 'processes_tasks', 'processes', 'Compatibilidad histórica'
    UNION ALL SELECT 'procesos_tareas', 'processes', 'Compatibilidad en español'
    UNION ALL SELECT 'kpi', 'kpis', 'Compatibilidad histórica'
) aliases
WHERE v.version_code = '2026.07-premium-v1';
