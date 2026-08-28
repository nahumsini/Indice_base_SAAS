-- Expand the versioned commercial catalog so technical modules can be sold
-- individually, combined in explicitly priced packages, and complemented by
-- quantity-based products and promotions. Historical catalog rows remain
-- intact and existing subscriptions continue pointing to their agreed version.

ALTER TABLE billing_catalog_products
  ADD COLUMN commercial_kind VARCHAR(24) NOT NULL DEFAULT 'MODULE' AFTER product_type,
  ADD COLUMN description VARCHAR(500) NULL AFTER display_name,
  ADD KEY idx_billing_catalog_products_kind (
    catalog_version_id, commercial_kind, active, sort_order
  );

UPDATE billing_catalog_products product
SET product.commercial_kind = CASE
    WHEN product.product_type = 'CORE' THEN 'CORE'
    WHEN (
      SELECT COUNT(*)
      FROM billing_product_capabilities capability
      WHERE capability.product_id = product.id
    ) > 1 THEN 'PACKAGE'
    ELSE 'MODULE'
END;

CREATE TABLE billing_package_items (
    package_product_id BIGINT NOT NULL,
    included_product_id BIGINT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (package_product_id, included_product_id),
    KEY idx_billing_package_items_included (included_product_id),
    CONSTRAINT fk_billing_package_items_package
        FOREIGN KEY (package_product_id) REFERENCES billing_catalog_products (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_billing_package_items_included
        FOREIGN KEY (included_product_id) REFERENCES billing_catalog_products (id)
        ON DELETE RESTRICT,
    CONSTRAINT chk_billing_package_items_distinct
        CHECK (package_product_id <> included_product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A draft is the only version allowed to receive the normalized offer model.
-- Reuse every existing single-module product and create the missing individual
-- products for capabilities that were previously available only inside bundles.
INSERT INTO billing_catalog_products (
    catalog_version_id, product_code, display_name, product_type,
    commercial_kind, sort_order, active
)
SELECT version_row.id,
       CONCAT('module_', module_row.slug),
       module_row.name,
       CASE WHEN module_row.module_category = 'basic' THEN 'BASIC' ELSE 'ADDON' END,
       'MODULE',
       200 + module_row.sort_order,
       0
FROM billing_catalog_versions version_row
JOIN modules module_row
  ON module_row.is_core = 0
 AND module_row.is_active = 1
 AND module_row.assignment_enabled = 1
 AND LOWER(module_row.lifecycle_status) IN ('pilot', 'released')
WHERE version_row.status = 'DRAFT'
  AND NOT EXISTS (
      SELECT 1
      FROM billing_catalog_products represented_product
      JOIN billing_product_capabilities represented_capability
        ON represented_capability.product_id = represented_product.id
      WHERE represented_product.catalog_version_id = version_row.id
        AND represented_product.commercial_kind = 'MODULE'
        AND BINARY (
          CASE represented_capability.capability_code
            WHEN 'sales' THEN 'crm'
            ELSE represented_capability.capability_code
          END
        ) = BINARY module_row.slug
  );

INSERT INTO billing_product_capabilities (product_id, capability_code)
SELECT product.id, module_row.slug
FROM billing_catalog_products product
JOIN billing_catalog_versions version_row
  ON version_row.id = product.catalog_version_id
 AND version_row.status = 'DRAFT'
JOIN modules module_row
  ON BINARY product.product_code = BINARY CONCAT('module_', module_row.slug)
WHERE product.commercial_kind = 'MODULE'
  AND NOT EXISTS (
      SELECT 1
      FROM billing_product_capabilities existing_capability
      WHERE existing_capability.product_id = product.id
        AND BINARY existing_capability.capability_code = BINARY module_row.slug
  );

-- Build package composition from the already approved capability mapping.
INSERT INTO billing_package_items (
    package_product_id, included_product_id, sort_order
)
SELECT package_product.id,
       module_product.id,
       module_product.sort_order
FROM billing_catalog_products package_product
JOIN billing_catalog_versions version_row
  ON version_row.id = package_product.catalog_version_id
 AND version_row.status = 'DRAFT'
JOIN billing_product_capabilities package_capability
  ON package_capability.product_id = package_product.id
JOIN modules module_row
  ON BINARY module_row.slug = BINARY (
    CASE package_capability.capability_code
      WHEN 'sales' THEN 'crm'
      ELSE package_capability.capability_code
    END
  )
JOIN billing_catalog_products module_product
  ON module_product.catalog_version_id = package_product.catalog_version_id
 AND module_product.commercial_kind = 'MODULE'
JOIN billing_product_capabilities module_capability
  ON module_capability.product_id = module_product.id
 AND BINARY (
   CASE module_capability.capability_code
     WHEN 'sales' THEN 'crm'
     ELSE module_capability.capability_code
   END
 ) = BINARY module_row.slug
WHERE package_product.commercial_kind = 'PACKAGE'
ON DUPLICATE KEY UPDATE sort_order = VALUES(sort_order);

-- Every module and package owns its monthly and annual commercial price.
-- Unknown prices intentionally remain DRAFT and block publication.
INSERT INTO billing_catalog_prices (
    catalog_version_id, catalog_product_id, billable_code, price_type,
    billing_interval, currency, unit_amount_cents, included_quantity,
    external_price_id, status
)
SELECT product.catalog_version_id,
       product.id,
       product.product_code,
       CASE product.commercial_kind
         WHEN 'PACKAGE' THEN 'PACKAGE'
         ELSE 'PRODUCT'
       END,
       interval_row.billing_interval,
       'USD',
       NULL,
       1,
       NULL,
       'DRAFT'
FROM billing_catalog_products product
JOIN billing_catalog_versions version_row
  ON version_row.id = product.catalog_version_id
 AND version_row.status = 'DRAFT'
JOIN (
    SELECT 'MONTH' AS billing_interval
    UNION ALL SELECT 'YEAR'
) interval_row
WHERE product.commercial_kind IN ('MODULE', 'PACKAGE')
  AND NOT EXISTS (
      SELECT 1
      FROM billing_catalog_prices existing_price
      WHERE existing_price.catalog_version_id = product.catalog_version_id
        AND BINARY existing_price.billable_code = BINARY product.product_code
        AND existing_price.billing_interval = interval_row.billing_interval
        AND existing_price.currency = 'USD'
  );

-- Extra users are a normal quantity-based catalog product. Keep the legacy
-- extra_seat rows as historical compatibility and copy their current terms.
INSERT INTO billing_catalog_products (
    catalog_version_id, product_code, display_name, product_type,
    commercial_kind, sort_order, active
)
SELECT version_row.id, 'extra_user', 'Usuario adicional', 'ADDON',
       'SEAT', 9000, 1
FROM billing_catalog_versions version_row
WHERE version_row.status = 'DRAFT'
  AND NOT EXISTS (
      SELECT 1
      FROM billing_catalog_products existing_product
      WHERE existing_product.catalog_version_id = version_row.id
        AND BINARY existing_product.product_code = BINARY 'extra_user'
  );

INSERT INTO billing_catalog_prices (
    catalog_version_id, catalog_product_id, billable_code, price_type,
    billing_interval, currency, unit_amount_cents, included_quantity,
    external_price_id, status
)
SELECT version_row.id,
       seat_product.id,
       'extra_user',
       'SEAT',
       interval_row.billing_interval,
       'USD',
       legacy_price.unit_amount_cents,
       1,
       legacy_price.external_price_id,
       CASE
         WHEN legacy_price.external_price_id LIKE 'price_%'
          AND legacy_price.unit_amount_cents > 0 THEN 'READY'
         ELSE 'DRAFT'
       END
FROM billing_catalog_versions version_row
JOIN billing_catalog_products seat_product
  ON seat_product.catalog_version_id = version_row.id
 AND BINARY seat_product.product_code = BINARY 'extra_user'
JOIN (
    SELECT 'MONTH' AS billing_interval
    UNION ALL SELECT 'YEAR'
) interval_row
LEFT JOIN billing_catalog_prices legacy_price
  ON legacy_price.catalog_version_id = version_row.id
 AND BINARY legacy_price.billable_code = BINARY 'extra_seat'
 AND legacy_price.billing_interval = interval_row.billing_interval
 AND legacy_price.currency = 'USD'
WHERE version_row.status = 'DRAFT'
  AND NOT EXISTS (
      SELECT 1
      FROM billing_catalog_prices existing_price
      WHERE existing_price.catalog_version_id = version_row.id
        AND BINARY existing_price.billable_code = BINARY 'extra_user'
        AND existing_price.billing_interval = interval_row.billing_interval
        AND existing_price.currency = 'USD'
  );

CREATE TABLE billing_catalog_promotions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    catalog_version_id BIGINT NOT NULL,
    promotion_code VARCHAR(80) NOT NULL,
    display_name VARCHAR(160) NOT NULL,
    description VARCHAR(500) NULL,
    discount_type VARCHAR(24) NOT NULL,
    percent_basis_points INT NULL,
    amount_off_cents BIGINT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    duration_type VARCHAR(24) NOT NULL DEFAULT 'ONCE',
    duration_cycles INT NULL,
    starts_at TIMESTAMP(6) NULL,
    ends_at TIMESTAMP(6) NULL,
    external_promotion_code_id VARCHAR(255) NULL,
    active TINYINT(1) NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_billing_catalog_promotions_code (catalog_version_id, promotion_code),
    KEY idx_billing_catalog_promotions_active (
      catalog_version_id, active, starts_at, ends_at
    ),
    CONSTRAINT fk_billing_catalog_promotions_version
        FOREIGN KEY (catalog_version_id) REFERENCES billing_catalog_versions (id)
        ON DELETE CASCADE,
    CONSTRAINT chk_billing_catalog_promotions_type
        CHECK (discount_type IN ('PERCENT', 'FIXED')),
    CONSTRAINT chk_billing_catalog_promotions_duration
        CHECK (duration_type IN ('ONCE', 'REPEATING', 'FOREVER'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE billing_catalog_promotion_products (
    promotion_id BIGINT NOT NULL,
    catalog_product_id BIGINT NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (promotion_id, catalog_product_id),
    KEY idx_billing_catalog_promotion_products_product (catalog_product_id),
    CONSTRAINT fk_billing_catalog_promotion_products_promotion
        FOREIGN KEY (promotion_id) REFERENCES billing_catalog_promotions (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_billing_catalog_promotion_products_product
        FOREIGN KEY (catalog_product_id) REFERENCES billing_catalog_products (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE billing_signup_intents
  ADD COLUMN subtotal_amount_cents BIGINT NULL AFTER estimated_amount_cents,
  ADD COLUMN discount_amount_cents BIGINT NOT NULL DEFAULT 0 AFTER subtotal_amount_cents,
  ADD COLUMN promotion_code VARCHAR(80) NULL AFTER discount_amount_cents;

ALTER TABLE company_billing_subscriptions
  ADD COLUMN subtotal_amount_cents BIGINT NULL AFTER extra_seats,
  ADD COLUMN discount_amount_cents BIGINT NOT NULL DEFAULT 0 AFTER subtotal_amount_cents,
  ADD COLUMN promotion_code VARCHAR(80) NULL AFTER discount_amount_cents;

