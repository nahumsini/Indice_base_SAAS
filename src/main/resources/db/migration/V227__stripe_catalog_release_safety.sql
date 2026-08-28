-- Bind every catalog reference to a Stripe environment and account. Existing
-- identifiers are deliberately marked UNVERIFIED: V226 could only attest to
-- their local shape, not to the remote Stripe object or account.
ALTER TABLE billing_catalog_products
  ADD COLUMN stripe_mode VARCHAR(8) NULL AFTER stripe_tax_code,
  ADD COLUMN stripe_account_id VARCHAR(255) NULL AFTER stripe_mode,
  ADD COLUMN stripe_verified_at TIMESTAMP(6) NULL AFTER stripe_account_id,
  ADD COLUMN stripe_sync_status VARCHAR(16) NOT NULL DEFAULT 'PENDING' AFTER stripe_verified_at;

ALTER TABLE billing_catalog_prices
  ADD COLUMN stripe_mode VARCHAR(8) NULL AFTER stripe_tax_behavior,
  ADD COLUMN stripe_account_id VARCHAR(255) NULL AFTER stripe_mode,
  ADD COLUMN stripe_verified_at TIMESTAMP(6) NULL AFTER stripe_account_id,
  ADD COLUMN stripe_sync_status VARCHAR(16) NOT NULL DEFAULT 'PENDING' AFTER stripe_verified_at,
  ADD KEY idx_billing_catalog_prices_stripe_release
    (catalog_version_id, stripe_mode, stripe_sync_status);

ALTER TABLE billing_catalog_promotions
  ADD COLUMN stripe_mode VARCHAR(8) NULL AFTER external_promotion_code_id,
  ADD COLUMN stripe_account_id VARCHAR(255) NULL AFTER stripe_mode,
  ADD COLUMN stripe_verified_at TIMESTAMP(6) NULL AFTER stripe_account_id,
  ADD COLUMN stripe_sync_status VARCHAR(16) NOT NULL DEFAULT 'PENDING' AFTER stripe_verified_at;

UPDATE billing_catalog_products
SET stripe_mode = 'TEST', stripe_sync_status = 'UNVERIFIED'
WHERE external_product_id LIKE 'prod_%';

UPDATE billing_catalog_prices
SET stripe_mode = 'TEST', stripe_sync_status = 'UNVERIFIED'
WHERE external_price_id LIKE 'price_%';

UPDATE billing_catalog_promotions
SET stripe_mode = 'TEST', stripe_sync_status = 'UNVERIFIED'
WHERE external_promotion_code_id LIKE 'promo_%';

CREATE TABLE billing_catalog_stripe_sync_operations (
  id BIGINT NOT NULL AUTO_INCREMENT,
  operation_key CHAR(36) NOT NULL,
  catalog_version_id BIGINT NOT NULL,
  catalog_product_id BIGINT NOT NULL,
  stripe_mode VARCHAR(8) NOT NULL,
  stripe_account_id VARCHAR(255) NULL,
  monthly_amount_cents BIGINT NOT NULL,
  annual_amount_cents BIGINT NOT NULL,
  stripe_product_id VARCHAR(255) NULL,
  monthly_price_id VARCHAR(255) NULL,
  annual_price_id VARCHAR(255) NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
  attempt_count INT NOT NULL DEFAULT 0,
  last_error VARCHAR(500) NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  started_at TIMESTAMP(6) NULL,
  completed_at TIMESTAMP(6) NULL,
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_billing_catalog_stripe_sync_operation (operation_key),
  KEY idx_billing_catalog_stripe_sync_product (catalog_product_id, stripe_mode, status),
  CONSTRAINT fk_billing_catalog_stripe_sync_version
    FOREIGN KEY (catalog_version_id) REFERENCES billing_catalog_versions(id) ON DELETE CASCADE,
  CONSTRAINT fk_billing_catalog_stripe_sync_product
    FOREIGN KEY (catalog_product_id) REFERENCES billing_catalog_products(id) ON DELETE CASCADE
);
