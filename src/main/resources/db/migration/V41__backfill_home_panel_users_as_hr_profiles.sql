-- Ensure every company user created through the Home Panel has an HR work profile row.
-- HR screens currently show provisioned work profiles, so this bridges existing
-- Home Panel users into the HR employee surface.

INSERT INTO user_number_sequences (company_id, prefix, padding, next_number)
SELECT c.id,
       'USR',
       4,
       COALESCE(MAX(
         CASE
           WHEN TRIM(COALESCE(wp.user_code, '')) REGEXP '^USR-[0-9]+$'
             THEN CAST(SUBSTRING(TRIM(wp.user_code), 5) AS UNSIGNED)
           ELSE 0
         END
       ), 0) + 1
FROM companies c
LEFT JOIN user_work_profiles wp ON wp.company_id = c.id
GROUP BY c.id
ON DUPLICATE KEY UPDATE
  next_number = GREATEST(user_number_sequences.next_number, VALUES(next_number));

DROP TEMPORARY TABLE IF EXISTS tmp_home_panel_hr_profile_backfill;

CREATE TEMPORARY TABLE tmp_home_panel_hr_profile_backfill AS
SELECT uc.company_id,
       uc.id AS user_company_id,
       uc.user_id,
       CASE
         WHEN LOWER(COALESCE(uc.status, 'active')) IN ('inactive', 'inactivo', 'disabled') THEN 'inactive'
         ELSE 'active'
       END AS work_status,
       COALESCE(NULLIF(TRIM(seq.prefix), ''), 'USR') AS prefix,
       GREATEST(COALESCE(seq.padding, 4), 4) AS padding,
       seq.next_number,
       ROW_NUMBER() OVER (PARTITION BY uc.company_id ORDER BY uc.id) - 1 AS sequence_offset
FROM user_companies uc
INNER JOIN users u ON u.id = uc.user_id
INNER JOIN user_number_sequences seq ON seq.company_id = uc.company_id
LEFT JOIN user_work_profiles wp
  ON wp.company_id = uc.company_id
 AND wp.user_company_id = uc.id
WHERE wp.id IS NULL;

INSERT INTO user_work_profiles
    (company_id, user_company_id, user_id, user_code, status)
SELECT company_id,
       user_company_id,
       user_id,
       CONCAT(prefix, '-', LPAD(next_number + sequence_offset, padding, '0')),
       work_status
FROM tmp_home_panel_hr_profile_backfill;

UPDATE user_number_sequences seq
INNER JOIN (
    SELECT company_id, COUNT(*) AS inserted_count
    FROM tmp_home_panel_hr_profile_backfill
    GROUP BY company_id
) inserted ON inserted.company_id = seq.company_id
SET seq.next_number = seq.next_number + inserted.inserted_count,
    seq.updated_at = CURRENT_TIMESTAMP;

DROP TEMPORARY TABLE IF EXISTS tmp_home_panel_hr_profile_backfill;
