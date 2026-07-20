ALTER TABLE sales_public_catalogs
    ADD COLUMN protected_public_token VARCHAR(512) NULL AFTER public_token_hint;
