-- Restore the approved 5 GiB storage contract without editing the already
-- applied V234 migration. The 2026.08 offer is still a draft, so its storage
-- product may be corrected before publication without rewriting a contract.

ALTER TABLE company_storage_states
    ALTER COLUMN included_bytes SET DEFAULT 5368709120;

-- V234 raised enrolled companies from the original 5 GiB contract to 100 GiB.
-- Only that exact migration value is corrected; explicit custom capacities
-- remain untouched and storage benefit grants continue to represent courtesy
-- capacity independently.
UPDATE company_storage_states
SET included_bytes = 5368709120
WHERE included_bytes = 107374182400;

UPDATE billing_catalog_prices price
JOIN billing_catalog_products product
  ON product.id = price.catalog_product_id
JOIN billing_catalog_versions version
  ON version.id = product.catalog_version_id
SET price.billable_code = 'storage_block_5_gib'
WHERE version.version_code = '2026.08-global-v1'
  AND version.status = 'DRAFT'
  AND product.product_code = 'storage_block_100_gib'
  AND price.billable_code = 'storage_block_100_gib';

UPDATE billing_catalog_products product
JOIN billing_catalog_versions version
  ON version.id = product.catalog_version_id
SET product.product_code = 'storage_block_5_gib',
    product.display_name = 'Almacenamiento adicional de 5 GiB',
    product.description = 'Bloque acumulable de 5 GiB cargado automaticamente en la siguiente factura.'
WHERE version.version_code = '2026.08-global-v1'
  AND version.status = 'DRAFT'
  AND product.product_code = 'storage_block_100_gib';
