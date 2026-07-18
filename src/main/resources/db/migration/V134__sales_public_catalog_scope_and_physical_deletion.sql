-- Sales Public Catalog is a new Engine-v2 kiosk: incomplete scope is not a
-- supported legacy state. Organizational deletion must first reassign or remove
-- the kiosk, rather than silently clearing its authorization boundary.
ALTER TABLE sales_public_catalogs
    DROP FOREIGN KEY fk_sales_public_catalogs_unit,
    DROP FOREIGN KEY fk_sales_public_catalogs_business,
    MODIFY COLUMN unit_id BIGINT NOT NULL,
    MODIFY COLUMN business_id BIGINT NOT NULL,
    ADD CONSTRAINT fk_sales_public_catalogs_unit_restrict
        FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_sales_public_catalogs_business_restrict
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE RESTRICT;

-- Preserve the organizational scope and catalog identity on functional requests so
-- the operational kiosk row can be physically deleted without losing Sales history.
ALTER TABLE sales_public_catalog_requests
    ADD COLUMN catalog_code_snapshot VARCHAR(80) NULL AFTER catalog_id,
    ADD COLUMN catalog_name_snapshot VARCHAR(180) NULL AFTER catalog_code_snapshot,
    ADD COLUMN unit_id BIGINT NULL AFTER catalog_name_snapshot,
    ADD COLUMN business_id BIGINT NULL AFTER unit_id;

UPDATE sales_public_catalog_requests request
JOIN sales_public_catalogs catalog ON catalog.id = request.catalog_id
SET request.catalog_code_snapshot = catalog.code,
    request.catalog_name_snapshot = catalog.name,
    request.unit_id = catalog.unit_id,
    request.business_id = catalog.business_id
WHERE request.catalog_code_snapshot IS NULL;

ALTER TABLE sales_public_catalog_requests
    MODIFY COLUMN catalog_code_snapshot VARCHAR(80) NOT NULL,
    MODIFY COLUMN catalog_name_snapshot VARCHAR(180) NOT NULL,
    MODIFY COLUMN unit_id BIGINT NOT NULL,
    MODIFY COLUMN business_id BIGINT NOT NULL,
    ADD KEY idx_sales_public_catalog_requests_scope
        (company_id, unit_id, business_id, status, created_at),
    DROP FOREIGN KEY fk_sales_public_catalog_requests_catalog;

-- Module audit is historical evidence. It intentionally retains the numeric
-- historical catalog id, but no restrictive FK to the deleted operational row.
ALTER TABLE sales_public_catalog_audit_events
    DROP FOREIGN KEY fk_sales_public_catalog_audit_catalog;
