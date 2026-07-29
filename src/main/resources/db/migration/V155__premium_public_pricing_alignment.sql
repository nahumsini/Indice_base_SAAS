UPDATE billing_catalog_prices price
JOIN billing_catalog_versions version ON version.id = price.catalog_version_id
SET price.unit_amount_cents = CASE
        WHEN price.billable_code = 'basic_1' AND price.billing_interval = 'MONTH' THEN 6900
        WHEN price.billable_code = 'basic_1' AND price.billing_interval = 'YEAR' THEN 66240
        WHEN price.billable_code = 'basic_2' AND price.billing_interval = 'MONTH' THEN 10900
        WHEN price.billable_code = 'basic_2' AND price.billing_interval = 'YEAR' THEN 104640
        WHEN price.billable_code = 'basic_3' AND price.billing_interval = 'MONTH' THEN 14900
        WHEN price.billable_code = 'basic_3' AND price.billing_interval = 'YEAR' THEN 143040
        WHEN price.billable_code = 'basic_all' AND price.billing_interval = 'MONTH' THEN 19900
        WHEN price.billable_code = 'basic_all' AND price.billing_interval = 'YEAR' THEN 191040
        WHEN price.billable_code = 'extra_seat' AND price.billing_interval = 'MONTH' THEN 1200
        WHEN price.billable_code = 'extra_seat' AND price.billing_interval = 'YEAR' THEN 11520
        ELSE price.unit_amount_cents
    END,
    price.status = 'READY'
WHERE version.version_code = '2026.07-premium-v1'
  AND (
    (price.billable_code IN ('basic_1', 'basic_2', 'basic_3', 'basic_all') AND price.price_type = 'BASE')
    OR (price.billable_code = 'extra_seat' AND price.price_type = 'ADDON')
  )
  AND price.billing_interval IN ('MONTH', 'YEAR');
