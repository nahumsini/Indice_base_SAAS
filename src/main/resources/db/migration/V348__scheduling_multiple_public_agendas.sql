-- Preserve existing IDs, aliases, tokens and reservations. Each company can own several public agendas.
ALTER TABLE scheduling_pages
    ADD KEY idx_scheduling_pages_company_id (company_id,id),
    DROP INDEX uq_scheduling_page_company;
