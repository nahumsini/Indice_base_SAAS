ALTER TABLE sales_public_catalogs
  ADD COLUMN allow_image_downloads TINYINT(1) NOT NULL DEFAULT 0 AFTER allow_purchase_request;
