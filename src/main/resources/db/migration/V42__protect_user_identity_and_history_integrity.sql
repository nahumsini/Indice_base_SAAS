SET @schema_name = DATABASE();

-- Keep duplicate cleanup narrowly scoped to rows that are safe to collapse before
-- adding database guardrails.
DELETE role_dupe
FROM user_company_module_roles role_dupe
INNER JOIN user_company_module_roles role_keep
  ON role_keep.user_company_id = role_dupe.user_company_id
 AND role_keep.module_slug = role_dupe.module_slug
 AND role_keep.id < role_dupe.id;

DELETE role_row
FROM user_company_module_roles role_row
LEFT JOIN modules module_row ON module_row.slug = role_row.module_slug
WHERE module_row.slug IS NULL;

DELETE favorite_row
FROM user_module_favorites favorite_row
LEFT JOIN modules module_row ON module_row.slug = favorite_row.module_slug
WHERE module_row.slug IS NULL;

DELETE target_dupe
FROM hr_announcement_targets target_dupe
INNER JOIN hr_announcement_targets target_keep
  ON target_keep.announcement_id = target_dupe.announcement_id
 AND target_keep.target_type = target_dupe.target_type
 AND target_keep.target_value = target_dupe.target_value
 AND target_keep.id < target_dupe.id;

UPDATE user_invitations invitation_dupe
INNER JOIN (
    SELECT company_id, LOWER(email) AS email_key, MIN(id) AS keep_id
    FROM user_invitations
    WHERE LOWER(COALESCE(status, 'pending')) = 'pending'
    GROUP BY company_id, LOWER(email)
    HAVING COUNT(*) > 1
) duplicate_invitation
  ON duplicate_invitation.company_id = invitation_dupe.company_id
 AND duplicate_invitation.email_key = LOWER(invitation_dupe.email)
SET invitation_dupe.status = 'cancelled',
    invitation_dupe.updated_at = CURRENT_TIMESTAMP
WHERE invitation_dupe.id <> duplicate_invitation.keep_id
  AND LOWER(COALESCE(invitation_dupe.status, 'pending')) = 'pending';

DROP TEMPORARY TABLE IF EXISTS tmp_active_asset_assignment_keep;
CREATE TEMPORARY TABLE tmp_active_asset_assignment_keep AS
SELECT company_id, asset_id, MAX(id) AS keep_id
FROM user_asset_assignments
WHERE ended_at IS NULL
GROUP BY company_id, asset_id
HAVING COUNT(*) > 1;

UPDATE user_asset_assignments assignment_row
INNER JOIN tmp_active_asset_assignment_keep assignment_keep
  ON assignment_keep.company_id = assignment_row.company_id
 AND assignment_keep.asset_id = assignment_row.asset_id
SET assignment_row.ended_at = assignment_row.started_at,
    assignment_row.ended_by_user_id = COALESCE(assignment_row.ended_by_user_id, assignment_row.created_by_user_id),
    assignment_row.updated_at = CURRENT_TIMESTAMP
WHERE assignment_row.id <> assignment_keep.keep_id
  AND assignment_row.ended_at IS NULL;

DROP TEMPORARY TABLE IF EXISTS tmp_active_asset_assignment_keep;

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.statistics
     WHERE table_schema = @schema_name
       AND table_name = 'user_companies'
       AND index_name = 'uq_user_companies_company_user') = 0,
    'ALTER TABLE user_companies ADD CONSTRAINT uq_user_companies_company_user UNIQUE (company_id, user_id)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.statistics
     WHERE table_schema = @schema_name
       AND table_name = 'user_company_module_roles'
       AND index_name = 'uq_user_company_module_roles_company_module') = 0,
    'ALTER TABLE user_company_module_roles ADD CONSTRAINT uq_user_company_module_roles_company_module UNIQUE (user_company_id, module_slug)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.referential_constraints
     WHERE constraint_schema = @schema_name
       AND table_name = 'user_company_module_roles'
       AND constraint_name = 'fk_user_company_module_roles_module') = 0,
    'ALTER TABLE user_company_module_roles ADD CONSTRAINT fk_user_company_module_roles_module FOREIGN KEY (module_slug) REFERENCES modules (slug) ON DELETE CASCADE',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.referential_constraints
     WHERE constraint_schema = @schema_name
       AND table_name = 'user_module_favorites'
       AND constraint_name = 'fk_user_module_favorites_module') = 0,
    'ALTER TABLE user_module_favorites ADD CONSTRAINT fk_user_module_favorites_module FOREIGN KEY (module_slug) REFERENCES modules (slug) ON DELETE CASCADE',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.statistics
     WHERE table_schema = @schema_name
       AND table_name = 'hr_announcement_targets'
       AND index_name = 'uq_hr_announcement_targets_unique_target') = 0,
    'ALTER TABLE hr_announcement_targets ADD CONSTRAINT uq_hr_announcement_targets_unique_target UNIQUE (announcement_id, target_type, target_value)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = @schema_name
       AND table_name = 'user_invitations'
       AND column_name = 'pending_email_key') = 0,
    'ALTER TABLE user_invitations ADD COLUMN pending_email_key varchar(120) GENERATED ALWAYS AS (CASE WHEN LOWER(COALESCE(status, ''pending'')) = ''pending'' THEN LOWER(email) ELSE NULL END) STORED AFTER email',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.statistics
     WHERE table_schema = @schema_name
       AND table_name = 'user_invitations'
       AND index_name = 'uq_user_invitations_company_pending_email') = 0,
    'ALTER TABLE user_invitations ADD CONSTRAINT uq_user_invitations_company_pending_email UNIQUE (company_id, pending_email_key)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.statistics
     WHERE table_schema = @schema_name
       AND table_name = 'user_asset_assignments'
       AND index_name = 'uq_user_asset_assignments_active_asset') = 0,
    'ALTER TABLE user_asset_assignments ADD UNIQUE INDEX uq_user_asset_assignments_active_asset (company_id, ((CASE WHEN ended_at IS NULL THEN asset_id ELSE NULL END)))',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
