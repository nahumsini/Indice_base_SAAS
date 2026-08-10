-- IME is a company diagnosis. Preserve all historical versions while removing
-- the temporary per-user ownership introduced in V172.
CREATE TEMPORARY TABLE tmp_company_business_profile_versions AS
SELECT
    profile.id,
    ROW_NUMBER() OVER (
        PARTITION BY profile.company_id
        ORDER BY
            CASE WHEN ownership.owner_user_id = profile.subject_user_id THEN 1 ELSE 0 END,
            profile.version,
            profile.id
    ) AS company_version
FROM company_business_profiles profile
LEFT JOIN company_ownerships ownership
    ON ownership.company_id = profile.company_id
   AND ownership.status = 'ACTIVE';

ALTER TABLE company_business_profiles
    DROP FOREIGN KEY fk_company_business_profiles_subject_user,
    DROP INDEX uq_company_business_profiles_subject_version,
    DROP INDEX idx_company_business_profiles_subject_status;

UPDATE company_business_profiles profile
JOIN tmp_company_business_profile_versions version_map
    ON version_map.id = profile.id
SET profile.version = version_map.company_version;

ALTER TABLE company_business_profiles
    DROP COLUMN subject_user_id,
    ADD UNIQUE KEY uq_company_business_profiles_company_version (company_id, version);

DROP TEMPORARY TABLE tmp_company_business_profile_versions;

-- Personal Performance leaves Panel Inicial and its old permission is no
-- longer assignable. The private data remains intact for a future, separate
-- human-development product.
DELETE FROM user_company_tab_permissions
WHERE module_slug = 'config_center'
  AND tab_key = 'personal-performance';

DELETE FROM user_invitation_tab_permissions
WHERE module_slug = 'config_center'
  AND tab_key = 'personal-performance';
