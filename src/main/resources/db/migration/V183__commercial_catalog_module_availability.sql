-- A BASIC product is commercially selectable only while every technical
-- capability it exposes still points to a globally available module.
-- Existing subscriptions keep their versioned product rows; this view gates
-- only new selections made from signup, Root provisioning and self-service.

CREATE OR REPLACE VIEW billing_available_basic_products AS
SELECT product.id,
       product.catalog_version_id,
       product.product_code,
       product.display_name,
       product.product_type,
       product.sort_order,
       product.active,
       product.created_at
FROM billing_catalog_products product
WHERE product.product_type = 'BASIC'
  AND product.active = 1
  AND NOT EXISTS (
      SELECT 1
      FROM billing_product_capabilities capability
      LEFT JOIN modules module_row
        ON module_row.slug COLLATE utf8mb4_unicode_ci =
           (CASE capability.capability_code WHEN 'sales' THEN 'crm' ELSE capability.capability_code END)
             COLLATE utf8mb4_unicode_ci
      WHERE capability.product_id = product.id
        AND (module_row.id IS NULL OR COALESCE(module_row.is_active, 1) = 0)
  );
