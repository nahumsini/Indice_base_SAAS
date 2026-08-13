-- Connect the technical module registry with the commercial catalog.
-- BASIC products continue to form the base package. Complementary and AI
-- modules are versioned ADDON products with their own recurring price.

ALTER TABLE billing_catalog_prices
  ADD COLUMN catalog_product_id BIGINT NULL AFTER catalog_version_id,
  ADD KEY idx_billing_catalog_prices_product (catalog_product_id),
  ADD CONSTRAINT fk_billing_catalog_prices_product
    FOREIGN KEY (catalog_product_id) REFERENCES billing_catalog_products (id)
    ON DELETE CASCADE;

UPDATE billing_catalog_prices price
JOIN billing_catalog_products product
  ON product.catalog_version_id = price.catalog_version_id
 AND BINARY product.product_code = BINARY price.billable_code
SET price.catalog_product_id = product.id
WHERE price.catalog_product_id IS NULL;

INSERT INTO billing_catalog_products (
    catalog_version_id,
    product_code,
    display_name,
    product_type,
    sort_order,
    active
)
SELECT version_row.id,
       CONCAT('addon_', module_row.slug),
       module_row.name,
       'ADDON',
       1000 + module_row.sort_order,
       CASE
         WHEN module_row.is_active = 1
          AND module_row.assignment_enabled = 1
          AND LOWER(module_row.lifecycle_status) IN ('pilot', 'released') THEN 1
         ELSE 0
       END
FROM billing_catalog_versions version_row
JOIN modules module_row
  ON module_row.module_category IN ('complementary', 'ai')
WHERE version_row.status = 'ACTIVE'
  AND NOT EXISTS (
      SELECT 1
      FROM billing_catalog_products existing_product
      WHERE existing_product.catalog_version_id = version_row.id
        AND BINARY existing_product.product_code = BINARY CONCAT('addon_', module_row.slug)
  );

INSERT INTO billing_product_capabilities (product_id, capability_code)
SELECT product.id, module_row.slug
FROM billing_catalog_products product
JOIN billing_catalog_versions version_row
  ON version_row.id = product.catalog_version_id
 AND version_row.status = 'ACTIVE'
JOIN modules module_row
  ON BINARY product.product_code = BINARY CONCAT('addon_', module_row.slug)
WHERE product.product_type = 'ADDON'
  AND module_row.module_category IN ('complementary', 'ai')
  AND NOT EXISTS (
      SELECT 1
      FROM billing_product_capabilities existing_capability
      WHERE existing_capability.product_id = product.id
        AND BINARY existing_capability.capability_code = BINARY module_row.slug
  );

INSERT INTO billing_catalog_prices (
    catalog_version_id,
    catalog_product_id,
    billable_code,
    price_type,
    billing_interval,
    currency,
    unit_amount_cents,
    included_quantity,
    external_price_id,
    status
)
SELECT product.catalog_version_id,
       product.id,
       product.product_code,
       'ADDON',
       interval_row.billing_interval,
       'USD',
       NULL,
       1,
       NULL,
       'DRAFT'
FROM billing_catalog_products product
JOIN billing_catalog_versions version_row
  ON version_row.id = product.catalog_version_id
 AND version_row.status = 'ACTIVE'
JOIN (
    SELECT 'MONTH' AS billing_interval
    UNION ALL SELECT 'YEAR'
) interval_row
WHERE product.product_type = 'ADDON'
  AND NOT EXISTS (
      SELECT 1
      FROM billing_catalog_prices existing_price
      WHERE existing_price.catalog_version_id = product.catalog_version_id
        AND BINARY existing_price.billable_code = BINARY product.product_code
        AND existing_price.billing_interval = interval_row.billing_interval
        AND existing_price.currency = 'USD'
  );

CREATE TABLE company_billing_subscription_items (
    id BIGINT NOT NULL AUTO_INCREMENT,
    subscription_id BIGINT NOT NULL,
    item_type VARCHAR(24) NOT NULL,
    catalog_product_id BIGINT NULL,
    billable_code VARCHAR(80) NOT NULL,
    billing_interval VARCHAR(16) NOT NULL,
    external_price_id VARCHAR(255) NULL,
    stripe_subscription_item_id VARCHAR(255) NULL,
    quantity INT NOT NULL DEFAULT 1,
    status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_company_billing_subscription_item_definition (
        subscription_id,
        item_type,
        billable_code
    ),
    UNIQUE KEY uq_company_billing_subscription_item_stripe (stripe_subscription_item_id),
    KEY idx_company_billing_subscription_items_product (catalog_product_id),
    CONSTRAINT fk_company_billing_subscription_items_subscription
        FOREIGN KEY (subscription_id) REFERENCES company_billing_subscriptions (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_company_billing_subscription_items_product
        FOREIGN KEY (catalog_product_id) REFERENCES billing_catalog_products (id)
        ON DELETE RESTRICT,
    CONSTRAINT chk_company_billing_subscription_items_type
        CHECK (item_type IN ('BASE', 'SEAT', 'PRODUCT', 'STORAGE')),
    CONSTRAINT chk_company_billing_subscription_items_quantity
        CHECK (quantity >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE OR REPLACE VIEW billing_available_commercial_products AS
SELECT product.id,
       product.catalog_version_id,
       product.product_code,
       product.display_name,
       product.product_type,
       product.sort_order,
       product.active,
       product.created_at
FROM billing_catalog_products product
WHERE product.product_type IN ('BASIC', 'ADDON')
  AND product.active = 1
  AND EXISTS (
      SELECT 1
      FROM billing_product_capabilities capability
      WHERE capability.product_id = product.id
  )
  AND NOT EXISTS (
      SELECT 1
      FROM billing_product_capabilities capability
      LEFT JOIN modules module_row
        ON BINARY module_row.slug =
           BINARY (CASE capability.capability_code WHEN 'sales' THEN 'crm' ELSE capability.capability_code END)
      WHERE capability.product_id = product.id
        AND (
            module_row.id IS NULL
            OR COALESCE(module_row.is_active, 1) = 0
            OR (
                product.product_type = 'ADDON'
                AND (
                    COALESCE(module_row.assignment_enabled, 0) = 0
                    OR LOWER(module_row.lifecycle_status) NOT IN ('pilot', 'released')
                )
            )
        )
  )
  AND (
      product.product_type = 'BASIC'
      OR (
          EXISTS (
              SELECT 1
              FROM billing_catalog_prices month_price
              WHERE month_price.catalog_version_id = product.catalog_version_id
                AND month_price.billable_code = product.product_code
                AND month_price.price_type = 'ADDON'
                AND month_price.billing_interval = 'MONTH'
                AND month_price.currency = 'USD'
                AND month_price.unit_amount_cents > 0
                AND month_price.status IN ('READY', 'ACTIVE')
          )
          AND EXISTS (
              SELECT 1
              FROM billing_catalog_prices year_price
              WHERE year_price.catalog_version_id = product.catalog_version_id
                AND year_price.billable_code = product.product_code
                AND year_price.price_type = 'ADDON'
                AND year_price.billing_interval = 'YEAR'
                AND year_price.currency = 'USD'
                AND year_price.unit_amount_cents > 0
                AND year_price.status IN ('READY', 'ACTIVE')
          )
      )
  );
