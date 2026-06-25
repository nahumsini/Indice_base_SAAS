-- Prevent previously embedded product images from keeping oversized JSON metadata.
-- Sales product images must be referenced by URL/object storage, not stored as base64.

UPDATE sales_products
SET metadata_json = JSON_REMOVE(metadata_json, '$.gallery')
WHERE metadata_json IS NOT NULL
  AND CAST(metadata_json AS CHAR) LIKE '%data:image%';

UPDATE sales_products
SET metadata_json = JSON_REMOVE(metadata_json, '$.imageUrl')
WHERE metadata_json IS NOT NULL
  AND JSON_UNQUOTE(JSON_EXTRACT(metadata_json, '$.imageUrl')) LIKE 'data:%';
