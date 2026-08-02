-- The launch loyalty rate applies to the selected product package only.
-- Additional users remain USD 12/month and therefore USD 144/year.
UPDATE billing_catalog_prices price
JOIN billing_catalog_versions version ON version.id = price.catalog_version_id
SET price.unit_amount_cents = 14400,
    price.status = 'READY'
WHERE version.version_code = '2026.07-premium-v1'
  AND price.billable_code = 'extra_seat'
  AND price.price_type = 'ADDON'
  AND price.billing_interval = 'YEAR'
  AND price.currency = 'USD';
