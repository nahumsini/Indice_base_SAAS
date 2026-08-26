ALTER TABLE sales_products
  ADD COLUMN reservable TINYINT(1) NOT NULL DEFAULT 0 AFTER pos_ready,
  ADD COLUMN availability_ical_url_protected VARCHAR(3072) NULL AFTER reservable,
  ADD CONSTRAINT chk_sales_products_reservable_availability
    CHECK (
      (reservable = 0 AND availability_ical_url_protected IS NULL)
      OR (reservable = 1 AND availability_ical_url_protected IS NOT NULL)
    );
