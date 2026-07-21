INSERT INTO billing_catalog_prices (
    catalog_version_id,
    billable_code,
    price_type,
    billing_interval,
    currency,
    unit_amount_cents,
    included_quantity,
    status,
    effective_from
)
SELECT v.id, prices.billable_code, prices.price_type, prices.billing_interval,
       'USD', prices.unit_amount_cents, prices.included_quantity, prices.status,
       CURRENT_TIMESTAMP(6)
FROM billing_catalog_versions v
JOIN (
    SELECT 'basic_1' AS billable_code, 'BASE' AS price_type, 'MONTH' AS billing_interval,
           5900 AS unit_amount_cents, 1 AS included_quantity, 'READY' AS status
    UNION ALL SELECT 'basic_1', 'BASE', 'YEAR', 56640, 1, 'READY'
    UNION ALL SELECT 'basic_2', 'BASE', 'MONTH', 9900, 2, 'READY'
    UNION ALL SELECT 'basic_2', 'BASE', 'YEAR', 95040, 2, 'READY'
    UNION ALL SELECT 'basic_3', 'BASE', 'MONTH', 14900, 3, 'READY'
    UNION ALL SELECT 'basic_3', 'BASE', 'YEAR', 143040, 3, 'READY'
    UNION ALL SELECT 'basic_all', 'BASE', 'MONTH', NULL, 6, 'PENDING_PRICE'
    UNION ALL SELECT 'basic_all', 'BASE', 'YEAR', NULL, 6, 'PENDING_PRICE'
    UNION ALL SELECT 'extra_seat', 'ADDON', 'MONTH', 1200, 1, 'READY'
    UNION ALL SELECT 'extra_seat', 'ADDON', 'YEAR', 11520, 1, 'READY'
) prices
WHERE v.version_code = '2026.07-premium-v1';
