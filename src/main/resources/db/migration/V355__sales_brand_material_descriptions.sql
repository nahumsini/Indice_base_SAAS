ALTER TABLE sales_brand_assets
    ADD COLUMN description VARCHAR(500) NOT NULL DEFAULT '',
    ADD COLUMN logo_variant VARCHAR(20) NOT NULL DEFAULT '';
