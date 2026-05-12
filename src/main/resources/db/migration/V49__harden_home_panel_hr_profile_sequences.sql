-- Keep Home Panel users visible in HR without mutating the already-published V41.
-- This migration is intentionally idempotent so databases that already ran an
-- earlier branch ordering can safely converge after Flyway history repair.

INSERT INTO user_number_sequences (company_id, prefix, padding, next_number)
SELECT c.id,
       'USR',
       4,
       COALESCE(MAX(
         CASE
           WHEN TRIM(COALESCE(wp.user_code, '')) LIKE 'USR-%'
            AND SUBSTRING(TRIM(wp.user_code), 5) REGEXP '^[0-9]+$'
             THEN CAST(SUBSTRING(TRIM(wp.user_code), 5) AS UNSIGNED)
           ELSE 0
         END
       ), 0) + 1
FROM companies c
LEFT JOIN user_work_profiles wp ON wp.company_id = c.id
GROUP BY c.id
ON DUPLICATE KEY UPDATE
  next_number = GREATEST(user_number_sequences.next_number, VALUES(next_number));

DROP TEMPORARY TABLE IF EXISTS tmp_home_panel_hr_profile_sequence;

CREATE TEMPORARY TABLE tmp_home_panel_hr_profile_sequence AS
SELECT sequence_base.company_id,
       sequence_base.prefix,
       sequence_base.padding,
       GREATEST(
         sequence_base.next_number,
         COALESCE(MAX(
           CASE
             WHEN TRIM(COALESCE(wp.user_code, '')) LIKE CONCAT(sequence_base.prefix, '-%')
              AND SUBSTRING(TRIM(wp.user_code), CHAR_LENGTH(sequence_base.prefix) + 2) REGEXP '^[0-9]+$'
               THEN CAST(SUBSTRING(TRIM(wp.user_code), CHAR_LENGTH(sequence_base.prefix) + 2) AS UNSIGNED)
             ELSE 0
           END
         ), 0) + 1
       ) AS first_number
FROM (
    SELECT company_id,
           COALESCE(NULLIF(TRIM(prefix), ''), 'USR') AS prefix,
           GREATEST(COALESCE(padding, 4), 4) AS padding,
           GREATEST(COALESCE(next_number, 1), 1) AS next_number
    FROM user_number_sequences
) sequence_base
LEFT JOIN user_work_profiles wp ON wp.company_id = sequence_base.company_id
GROUP BY sequence_base.company_id,
         sequence_base.prefix,
         sequence_base.padding,
         sequence_base.next_number;

DROP TEMPORARY TABLE IF EXISTS tmp_home_panel_hr_profile_backfill;

CREATE TEMPORARY TABLE tmp_home_panel_hr_profile_backfill AS
SELECT uc.company_id,
       uc.id AS user_company_id,
       uc.user_id,
       CASE
         WHEN LOWER(COALESCE(uc.status, 'active')) IN ('inactive', 'inactivo', 'disabled') THEN 'inactive'
         ELSE 'active'
       END AS work_status,
       profile_sequence.prefix,
       profile_sequence.padding,
       profile_sequence.first_number + ROW_NUMBER() OVER (PARTITION BY uc.company_id ORDER BY uc.id) - 1 AS assigned_number
FROM user_companies uc
INNER JOIN users u ON u.id = uc.user_id
INNER JOIN tmp_home_panel_hr_profile_sequence profile_sequence ON profile_sequence.company_id = uc.company_id
LEFT JOIN user_work_profiles wp
  ON wp.company_id = uc.company_id
 AND wp.user_company_id = uc.id
WHERE wp.id IS NULL;

INSERT INTO user_work_profiles
    (company_id, user_company_id, user_id, user_code, status)
SELECT company_id,
       user_company_id,
       user_id,
       CONCAT(prefix, '-', LPAD(assigned_number, padding, '0')),
       work_status
FROM tmp_home_panel_hr_profile_backfill;

UPDATE user_number_sequences seq
INNER JOIN tmp_home_panel_hr_profile_sequence profile_sequence ON profile_sequence.company_id = seq.company_id
LEFT JOIN (
    SELECT company_id, MAX(assigned_number) + 1 AS next_number
    FROM tmp_home_panel_hr_profile_backfill
    GROUP BY company_id
) inserted ON inserted.company_id = seq.company_id
SET seq.next_number = GREATEST(seq.next_number, profile_sequence.first_number, COALESCE(inserted.next_number, profile_sequence.first_number)),
    seq.updated_at = CURRENT_TIMESTAMP;

DROP TEMPORARY TABLE IF EXISTS tmp_home_panel_hr_profile_backfill;
DROP TEMPORARY TABLE IF EXISTS tmp_home_panel_hr_profile_sequence;
