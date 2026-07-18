ALTER TABLE pos_supplier_submissions
    ADD COLUMN historical_portal_access_id BIGINT NULL AFTER portal_access_id,
    ADD COLUMN portal_scope_snapshot_json JSON NULL AFTER historical_portal_access_id,
    ADD KEY idx_pos_supplier_submissions_historical_portal (
        company_id, historical_portal_access_id
    );

UPDATE pos_supplier_submissions submission
JOIN pos_supplier_portal_access access
  ON access.id = submission.portal_access_id
 AND access.company_id = submission.company_id
JOIN finance_providers provider
  ON provider.id = access.provider_id
 AND provider.company_id = access.company_id
JOIN companies company
  ON company.id = access.company_id
LEFT JOIN units unit
  ON unit.id = provider.unit_id
 AND (unit.company_id = access.company_id OR unit.company_id IS NULL)
LEFT JOIN businesses business
  ON business.id = provider.business_id
 AND (business.company_id = access.company_id OR business.company_id IS NULL)
SET submission.historical_portal_access_id = access.id,
    submission.portal_scope_snapshot_json = JSON_OBJECT(
        'company_id', access.company_id,
        'company_name', company.name,
        'provider_id', access.provider_id,
        'provider_name', provider.name,
        'provider_email', provider.email,
        'unit_id', provider.unit_id,
        'unit_name', unit.name,
        'business_id', provider.business_id,
        'business_name', business.name,
        'portal_access_id', access.id,
        'portal_code_hint', access.portal_code_hint,
        'portal_status', access.status
    )
WHERE submission.portal_access_id IS NOT NULL;
