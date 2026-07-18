INSERT INTO kiosk_definitions (
    company_id, owner_module, kiosk_type, legacy_reference_id, code, name,
    status, unit_id, business_id, access_level, expires_at,
    public_token_hash, public_token_hint, legacy_token_recoverable,
    theme_key, default_locale, configuration_version, adapter_version,
    created_by, created_at, updated_by, updated_at
)
SELECT fund.company_id,
       'PETTY_CASH',
       'receipt_capture',
       fund.id,
       CONCAT('petty-cash-fund-', fund.id),
       fund.name,
       CASE
           WHEN fund.kiosk_enabled = TRUE AND fund.deleted_at IS NULL AND fund.status <> 'CLOSED'
               THEN 'ACTIVE'
           ELSE 'DISABLED'
       END,
       fund.unit_id,
       fund.business_id,
       'CONTROLLED',
       NULL,
       SHA2(fund.kiosk_public_token, 256),
       RIGHT(fund.kiosk_public_token, 8),
       1,
       'petty-cash',
       'es-MX',
       1,
       1,
       fund.created_by_user_id,
       fund.created_at,
       fund.updated_by_user_id,
       COALESCE(fund.updated_at, fund.created_at)
FROM finance_petty_cash_funds fund
WHERE fund.kiosk_public_token IS NOT NULL
  AND fund.kiosk_public_token <> ''
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    status = VALUES(status),
    unit_id = VALUES(unit_id),
    business_id = VALUES(business_id),
    public_token_hash = VALUES(public_token_hash),
    public_token_hint = VALUES(public_token_hint),
    updated_by = VALUES(updated_by),
    updated_at = VALUES(updated_at);
