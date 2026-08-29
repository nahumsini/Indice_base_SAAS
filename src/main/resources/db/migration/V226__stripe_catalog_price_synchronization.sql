-- Persist the Stripe objects created from the commercial catalog. Catalog
-- amounts remain tax-exclusive; Stripe Tax calculates the applicable tax at
-- Checkout from the customer's billing location and our registrations.

ALTER TABLE billing_catalog_products
  ADD COLUMN external_product_id VARCHAR(255) NULL AFTER description,
  ADD COLUMN stripe_tax_code VARCHAR(32) NOT NULL DEFAULT 'txcd_10103001' AFTER external_product_id,
  ADD COLUMN stripe_synced_at TIMESTAMP(6) NULL AFTER stripe_tax_code,
  ADD KEY idx_billing_catalog_products_external_product (external_product_id);

ALTER TABLE billing_catalog_prices
  ADD COLUMN stripe_tax_behavior VARCHAR(16) NULL AFTER external_price_id,
  ADD COLUMN stripe_synced_at TIMESTAMP(6) NULL AFTER stripe_tax_behavior;

-- Existing Stripe TEST prices were verified as tax-exclusive during billing
-- launch. Mark them as known so current drafts remain publishable.
UPDATE billing_catalog_prices
SET stripe_tax_behavior = 'EXCLUSIVE',
    stripe_synced_at = updated_at
WHERE external_price_id LIKE 'price_%';
