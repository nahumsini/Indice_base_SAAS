UPDATE billing_catalog_prices price
JOIN billing_catalog_versions version ON version.id = price.catalog_version_id
SET price.unit_amount_cents = CASE price.billing_interval
        WHEN 'MONTH' THEN 19900
        WHEN 'YEAR' THEN 191040
        ELSE price.unit_amount_cents
    END,
    price.status = 'READY'
WHERE version.version_code = '2026.07-premium-v1'
  AND price.billable_code = 'basic_all'
  AND price.price_type = 'BASE'
  AND price.billing_interval IN ('MONTH', 'YEAR');
