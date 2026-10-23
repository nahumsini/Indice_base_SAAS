-- A small decoded/re-encoded PNG brand mark belongs to its public agenda.
-- Existing agendas keep no custom logo; no business rows or public links are changed.
ALTER TABLE scheduling_pages ADD COLUMN logo_data_url MEDIUMTEXT NULL;
