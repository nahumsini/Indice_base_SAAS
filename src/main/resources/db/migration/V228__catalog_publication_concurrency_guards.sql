-- MySQL unique indexes allow multiple NULL values. Generated release slots
-- therefore enforce at most one ACTIVE and one DRAFT catalog without limiting
-- the number of historical SUPERSEDED versions.
ALTER TABLE billing_catalog_versions
  ADD COLUMN active_release_slot TINYINT
    GENERATED ALWAYS AS (CASE WHEN status = 'ACTIVE' THEN 1 ELSE NULL END) STORED,
  ADD COLUMN draft_release_slot TINYINT
    GENERATED ALWAYS AS (CASE WHEN status = 'DRAFT' THEN 1 ELSE NULL END) STORED,
  ADD UNIQUE KEY uq_billing_catalog_versions_single_active (active_release_slot),
  ADD UNIQUE KEY uq_billing_catalog_versions_single_draft (draft_release_slot);
