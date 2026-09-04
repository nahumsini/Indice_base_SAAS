-- Panel Inicial and KPIs are included platform capabilities. Legacy companies
-- created before the commercial catalog projection can be missing one of these
-- rows even though the active catalog grants it to every company.
INSERT INTO company_module_entitlements (
    company_id,
    module_slug,
    status,
    source
)
SELECT DISTINCT
    company.id,
    module_row.slug,
    'active',
    'core_catalog_reconcile'
FROM companies company
JOIN billing_catalog_versions catalog_version
  ON catalog_version.status = 'ACTIVE'
JOIN billing_catalog_products product
  ON product.catalog_version_id = catalog_version.id
 AND product.product_type = 'CORE'
 AND product.active = 1
JOIN billing_product_capabilities capability
  ON capability.product_id = product.id
JOIN modules module_row
  ON module_row.slug COLLATE utf8mb4_unicode_ci =
     capability.capability_code COLLATE utf8mb4_unicode_ci
 AND COALESCE(module_row.is_active, 1) = 1
 AND COALESCE(module_row.assignment_enabled, 1) = 1
 AND LOWER(COALESCE(module_row.lifecycle_status, 'released')) IN ('pilot', 'released')
WHERE company.platform_status = 'ACTIVE'
ON DUPLICATE KEY UPDATE
    status = VALUES(status),
    source = VALUES(source);
