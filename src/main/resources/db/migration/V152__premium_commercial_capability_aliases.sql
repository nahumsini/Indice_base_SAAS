INSERT INTO billing_capability_aliases (
    catalog_version_id,
    alias_code,
    canonical_code,
    compatibility_note
)
SELECT v.id, aliases.alias_code, aliases.canonical_code, aliases.compatibility_note
FROM billing_catalog_versions v
JOIN (
    SELECT 'panelinicial' AS alias_code, 'config_center' AS canonical_code, 'Compatibilidad histórica' AS compatibility_note
    UNION ALL SELECT 'punto_venta', 'pos', 'Compatibilidad histórica'
    UNION ALL SELECT 'procesos_tareas', 'processes', 'Compatibilidad en español'
) aliases
LEFT JOIN billing_capability_aliases existing
    ON existing.catalog_version_id = v.id
   AND existing.alias_code = aliases.alias_code
WHERE v.version_code = '2026.07-premium-v1'
  AND existing.id IS NULL;
