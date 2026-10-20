-- Explicit regional products share the native immutable catalog and publication workflow.
-- Existing products and contracts remain global/USD with their original capacity.
ALTER TABLE billing_catalog_products
    ADD COLUMN market_code CHAR(2) NULL,
    ADD COLUMN included_seats INT NOT NULL DEFAULT 5,
    ADD CONSTRAINT chk_catalog_product_market CHECK (market_code IS NULL OR market_code IN ('MX', 'CA')),
    ADD CONSTRAINT chk_catalog_product_seats CHECK (included_seats BETWEEN 1 AND 500);

-- No product, amount, Stripe reference or published catalog is seeded by this migration.
