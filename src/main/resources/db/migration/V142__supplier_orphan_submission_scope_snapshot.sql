-- A supplier portal may have been deleted before Engine v2 introduced the
-- immutable portal snapshot. The historical portal id cannot be reconstructed,
-- but the still-referenced provider and organizational scope must not remain
-- invisible to retention/audit tooling. Mark the provenance explicitly so this
-- recovery snapshot is never represented as the original submission-time scope.
UPDATE pos_supplier_submissions submission
JOIN finance_providers provider
  ON provider.id = submission.provider_id
 AND provider.company_id = submission.company_id
JOIN companies company
  ON company.id = submission.company_id
LEFT JOIN units unit
  ON unit.id = provider.unit_id
 AND (unit.company_id = submission.company_id OR unit.company_id IS NULL)
LEFT JOIN businesses business
  ON business.id = provider.business_id
 AND (business.company_id = submission.company_id OR business.company_id IS NULL)
SET submission.portal_scope_snapshot_json = JSON_OBJECT(
        'snapshot_provenance', 'PROVIDER_AT_V142_MIGRATION',
        'company_id', submission.company_id,
        'company_name', company.name,
        'provider_id', submission.provider_id,
        'provider_name', provider.name,
        'provider_email', provider.email,
        'unit_id', provider.unit_id,
        'unit_name', unit.name,
        'business_id', provider.business_id,
        'business_name', business.name,
        'portal_access_id', NULL,
        'portal_code_hint', NULL,
        'portal_status', 'DELETED_BEFORE_ENGINE_SNAPSHOT'
    )
WHERE submission.portal_access_id IS NULL
  AND submission.portal_scope_snapshot_json IS NULL;
