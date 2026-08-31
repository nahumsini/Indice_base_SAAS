-- Approved global commercial offer for Stripe TEST validation.
--
-- The version remains DRAFT until every recurring product and price has been
-- created and remotely verified in the configured Stripe account. Publishing
-- remains an explicit Root operation so the current active catalog and every
-- subscription attached to it keep their historical terms.

-- Preserve any previous working draft as history before claiming the single
-- DRAFT slot for this approved offer. Nothing is deleted and the ACTIVE offer
-- remains untouched.
UPDATE billing_catalog_versions
SET status = 'SUPERSEDED',
    effective_to = COALESCE(effective_to, CURRENT_TIMESTAMP)
WHERE status = 'DRAFT'
  AND BINARY version_code <> BINARY '2026.08-global-v1';

INSERT INTO billing_catalog_versions (version_code, status, effective_from)
SELECT '2026.08-global-v1', 'DRAFT', NULL
WHERE NOT EXISTS (
    SELECT 1
    FROM billing_catalog_versions
    WHERE BINARY version_code = BINARY '2026.08-global-v1'
);

INSERT INTO billing_catalog_products (
    catalog_version_id, product_code, display_name, description, product_type,
    commercial_kind, sort_order, active
)
SELECT version.id, definition.product_code, definition.display_name,
       definition.description, definition.product_type,
       definition.commercial_kind, definition.sort_order, definition.active
FROM billing_catalog_versions version
JOIN (
    SELECT 'core_platform' product_code, 'Panel inicial y KPIs' display_name,
           'Panel inicial, KPIs, seguridad, configuracion y facturacion incluidos.' description,
           'CORE' product_type, 'CORE' commercial_kind, 0 sort_order, 1 active
    UNION ALL SELECT 'module_hr', 'Recursos Humanos',
           'Gestion de personas y operacion de Recursos Humanos.',
           'BASIC', 'MODULE', 10, 1
    UNION ALL SELECT 'module_process_tasks', 'Tareas y Procesos',
           'Procesos operativos, responsables y seguimiento de tareas.',
           'BASIC', 'MODULE', 20, 1
    UNION ALL SELECT 'module_expenses', 'Gastos con caja chica',
           'Control de gastos y operacion de caja chica.',
           'BASIC', 'MODULE', 30, 1
    UNION ALL SELECT 'module_sales_inventory', 'Ventas con inventarios',
           'Ventas conectadas al control de inventarios.',
           'BASIC', 'MODULE', 40, 1
    UNION ALL SELECT 'module_pos_inventory', 'Punto de Venta con inventarios',
           'Punto de Venta conectado al control de inventarios.',
           'BASIC', 'MODULE', 50, 1
    UNION ALL SELECT 'module_receivables', 'Cartera',
           'Seguimiento operativo de cartera y cuentas por cobrar.',
           'BASIC', 'MODULE', 60, 1
    UNION ALL SELECT 'controla', 'Controla',
           'Recursos Humanos y Tareas y Procesos.',
           'BASIC', 'PACKAGE', 100, 1
    UNION ALL SELECT 'escala_sales', 'Escala Ventas',
           'Recursos Humanos, Tareas y Procesos, Gastos con caja chica y Ventas con inventarios.',
           'BASIC', 'PACKAGE', 110, 1
    UNION ALL SELECT 'escala_pos', 'Escala Punto de Venta',
           'Recursos Humanos, Tareas y Procesos, Gastos con caja chica y Punto de Venta con inventarios.',
           'BASIC', 'PACKAGE', 120, 1
    UNION ALL SELECT 'corporativiza', 'Corporativiza',
           'Todos los modulos basicos: Recursos Humanos, Tareas y Procesos, Gastos, Ventas, Punto de Venta y Cartera.',
           'BASIC', 'PACKAGE', 130, 1
    UNION ALL SELECT 'module_additional_unit', 'Modulo adicional',
           'Unidad de precio para dos o mas modulos sueltos o modulos agregados a un paquete.',
           'ADDON', 'VOLUME', 9000, 1
    UNION ALL SELECT 'extra_user', 'Usuario adicional',
           'Usuario contratado por encima de los cinco incluidos; el propietario ocupa un lugar.',
           'ADDON', 'SEAT', 9010, 1
    UNION ALL SELECT 'storage_block_100_gib', 'Almacenamiento adicional de 100 GiB',
           'Bloque acumulable cargado automaticamente en la siguiente factura.',
           'ADDON', 'STORAGE', 9020, 1
) definition
WHERE version.version_code = '2026.08-global-v1';

INSERT INTO billing_product_capabilities (product_id, capability_code)
SELECT product.id, definition.capability_code
FROM billing_catalog_products product
JOIN billing_catalog_versions version ON version.id = product.catalog_version_id
JOIN (
    SELECT 'core_platform' product_code, 'dashboard' capability_code
    UNION ALL SELECT 'core_platform', 'config_center'
    UNION ALL SELECT 'core_platform', 'kpis'
    UNION ALL SELECT 'core_platform', 'security'
    UNION ALL SELECT 'core_platform', 'billing'
    UNION ALL SELECT 'module_hr', 'human_resources'
    UNION ALL SELECT 'module_process_tasks', 'processes'
    UNION ALL SELECT 'module_expenses', 'expenses'
    UNION ALL SELECT 'module_expenses', 'petty_cash'
    UNION ALL SELECT 'module_sales_inventory', 'sales'
    UNION ALL SELECT 'module_sales_inventory', 'inventory'
    UNION ALL SELECT 'module_pos_inventory', 'pos'
    UNION ALL SELECT 'module_pos_inventory', 'inventory'
    UNION ALL SELECT 'module_receivables', 'receivables'
) definition ON BINARY definition.product_code = BINARY product.product_code
WHERE version.version_code = '2026.08-global-v1';

INSERT INTO billing_package_items (package_product_id, included_product_id, sort_order)
SELECT package.id, included.id, definition.sort_order
FROM billing_catalog_versions version
JOIN (
    SELECT 'controla' package_code, 'module_hr' included_code, 10 sort_order
    UNION ALL SELECT 'controla', 'module_process_tasks', 20
    UNION ALL SELECT 'escala_sales', 'module_hr', 10
    UNION ALL SELECT 'escala_sales', 'module_process_tasks', 20
    UNION ALL SELECT 'escala_sales', 'module_expenses', 30
    UNION ALL SELECT 'escala_sales', 'module_sales_inventory', 40
    UNION ALL SELECT 'escala_pos', 'module_hr', 10
    UNION ALL SELECT 'escala_pos', 'module_process_tasks', 20
    UNION ALL SELECT 'escala_pos', 'module_expenses', 30
    UNION ALL SELECT 'escala_pos', 'module_pos_inventory', 50
    UNION ALL SELECT 'corporativiza', 'module_hr', 10
    UNION ALL SELECT 'corporativiza', 'module_process_tasks', 20
    UNION ALL SELECT 'corporativiza', 'module_expenses', 30
    UNION ALL SELECT 'corporativiza', 'module_sales_inventory', 40
    UNION ALL SELECT 'corporativiza', 'module_pos_inventory', 50
    UNION ALL SELECT 'corporativiza', 'module_receivables', 60
) definition
JOIN billing_catalog_products package
  ON package.catalog_version_id = version.id
 AND BINARY package.product_code = BINARY definition.package_code
JOIN billing_catalog_products included
  ON included.catalog_version_id = version.id
 AND BINARY included.product_code = BINARY definition.included_code
WHERE version.version_code = '2026.08-global-v1';

-- Package capabilities are derived from their component modules so access and
-- commercial composition cannot drift apart.
INSERT INTO billing_product_capabilities (product_id, capability_code)
SELECT item.package_product_id, capability.capability_code
FROM billing_package_items item
JOIN billing_catalog_products package ON package.id = item.package_product_id
JOIN billing_catalog_versions version ON version.id = package.catalog_version_id
JOIN billing_product_capabilities capability ON capability.product_id = item.included_product_id
WHERE version.version_code = '2026.08-global-v1'
GROUP BY item.package_product_id, capability.capability_code;

INSERT INTO billing_capability_aliases (
    catalog_version_id, alias_code, canonical_code, compatibility_note
)
SELECT version.id, aliases.alias_code, aliases.canonical_code, aliases.compatibility_note
FROM billing_catalog_versions version
JOIN (
    SELECT 'home_panel' alias_code, 'config_center' canonical_code, 'Panel inicial' compatibility_note
    UNION ALL SELECT 'panel_inicial', 'config_center', 'Panel inicial'
    UNION ALL SELECT 'configcenter', 'config_center', 'Compatibilidad historica'
    UNION ALL SELECT 'humanresources', 'human_resources', 'Compatibilidad historica'
    UNION ALL SELECT 'caja_chica', 'petty_cash', 'Caja chica'
    UNION ALL SELECT 'point_of_sale', 'pos', 'Punto de Venta'
    UNION ALL SELECT 'punto_de_venta', 'pos', 'Punto de Venta'
    UNION ALL SELECT 'crm', 'sales', 'Slug tecnico de Ventas'
    UNION ALL SELECT 'cartera', 'receivables', 'Cartera'
    UNION ALL SELECT 'accounts_receivable', 'receivables', 'Compatibilidad historica'
    UNION ALL SELECT 'process_tasks', 'processes', 'Tareas y Procesos'
    UNION ALL SELECT 'procesos_tareas', 'processes', 'Tareas y Procesos'
    UNION ALL SELECT 'kpi', 'kpis', 'Compatibilidad historica'
) aliases
WHERE version.version_code = '2026.08-global-v1';

INSERT INTO billing_catalog_prices (
    catalog_version_id, catalog_product_id, billable_code, price_type,
    billing_interval, currency, unit_amount_cents, included_quantity,
    external_price_id, status
)
SELECT version.id, product.id, prices.billable_code, prices.price_type,
       prices.billing_interval, 'USD', prices.unit_amount_cents, 1,
       NULL, 'DRAFT'
FROM billing_catalog_versions version
JOIN (
    SELECT 'module_hr' billable_code, 'PRODUCT' price_type, 'MONTH' billing_interval, 7900 unit_amount_cents
    UNION ALL SELECT 'module_hr', 'PRODUCT', 'YEAR', 75840
    UNION ALL SELECT 'module_process_tasks', 'PRODUCT', 'MONTH', 7900
    UNION ALL SELECT 'module_process_tasks', 'PRODUCT', 'YEAR', 75840
    UNION ALL SELECT 'module_expenses', 'PRODUCT', 'MONTH', 7900
    UNION ALL SELECT 'module_expenses', 'PRODUCT', 'YEAR', 75840
    UNION ALL SELECT 'module_sales_inventory', 'PRODUCT', 'MONTH', 7900
    UNION ALL SELECT 'module_sales_inventory', 'PRODUCT', 'YEAR', 75840
    UNION ALL SELECT 'module_pos_inventory', 'PRODUCT', 'MONTH', 7900
    UNION ALL SELECT 'module_pos_inventory', 'PRODUCT', 'YEAR', 75840
    UNION ALL SELECT 'module_receivables', 'PRODUCT', 'MONTH', 7900
    UNION ALL SELECT 'module_receivables', 'PRODUCT', 'YEAR', 75840
    UNION ALL SELECT 'controla', 'PACKAGE', 'MONTH', 9900
    UNION ALL SELECT 'controla', 'PACKAGE', 'YEAR', 95040
    UNION ALL SELECT 'escala_sales', 'PACKAGE', 'MONTH', 14900
    UNION ALL SELECT 'escala_sales', 'PACKAGE', 'YEAR', 143040
    UNION ALL SELECT 'escala_pos', 'PACKAGE', 'MONTH', 14900
    UNION ALL SELECT 'escala_pos', 'PACKAGE', 'YEAR', 143040
    UNION ALL SELECT 'corporativiza', 'PACKAGE', 'MONTH', 19900
    UNION ALL SELECT 'corporativiza', 'PACKAGE', 'YEAR', 191040
    UNION ALL SELECT 'module_additional_unit', 'PRODUCT', 'MONTH', 4900
    UNION ALL SELECT 'module_additional_unit', 'PRODUCT', 'YEAR', 47040
    UNION ALL SELECT 'extra_user', 'SEAT', 'MONTH', 1200
    UNION ALL SELECT 'extra_user', 'SEAT', 'YEAR', 14400
    UNION ALL SELECT 'storage_block_100_gib', 'PRODUCT', 'MONTH', 1500
    UNION ALL SELECT 'storage_block_100_gib', 'PRODUCT', 'YEAR', 18000
) prices
JOIN billing_catalog_products product
  ON product.catalog_version_id = version.id
 AND BINARY product.product_code = BINARY prices.billable_code
WHERE version.version_code = '2026.08-global-v1';

-- Every enrolled company receives the newly approved included capacity. Usage
-- and purchased blocks are preserved. New rows inherit the same default.
ALTER TABLE company_storage_states
  ALTER COLUMN included_bytes SET DEFAULT 107374182400;

UPDATE company_storage_states
SET included_bytes = GREATEST(included_bytes, 107374182400);
