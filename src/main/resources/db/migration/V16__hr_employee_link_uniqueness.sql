UPDATE `hr_employees`
SET `email` = NULL
WHERE `email` IS NOT NULL
  AND TRIM(`email`) = '';

UPDATE `hr_employees`
SET `email` = LOWER(TRIM(`email`))
WHERE `email` IS NOT NULL
  AND TRIM(`email`) <> ''
  AND `email` <> LOWER(TRIM(`email`));

WITH ranked_portal_links AS (
  SELECT
    `employee_id`,
    ROW_NUMBER() OVER (
      PARTITION BY `company_id`, `linked_user_id`
      ORDER BY `employee_id` ASC
    ) AS `link_rank`
  FROM `hr_employee_portal_access`
  WHERE `linked_user_id` IS NOT NULL
)
UPDATE `hr_employee_portal_access` access_ref
JOIN ranked_portal_links ranked ON ranked.`employee_id` = access_ref.`employee_id`
SET access_ref.`linked_user_id` = NULL,
    access_ref.`invitation_status` = CASE
      WHEN LOWER(COALESCE(access_ref.`invitation_status`, '')) = 'linked' THEN 'not_invited'
      ELSE access_ref.`invitation_status`
    END
WHERE ranked.`link_rank` > 1;

WITH ranked_employee_emails AS (
  SELECT
    `id`,
    ROW_NUMBER() OVER (
      PARTITION BY `company_id`, `email`
      ORDER BY `id` ASC
    ) AS `email_rank`
  FROM `hr_employees`
  WHERE `email` IS NOT NULL
)
UPDATE `hr_employees` employee_ref
JOIN ranked_employee_emails ranked ON ranked.`id` = employee_ref.`id`
SET employee_ref.`email` = NULL
WHERE ranked.`email_rank` > 1;

ALTER TABLE `hr_employee_portal_access`
  ADD UNIQUE KEY `uq_hr_employee_portal_access_company_linked_user` (`company_id`, `linked_user_id`);

ALTER TABLE `hr_employees`
  ADD UNIQUE KEY `uq_hr_employees_company_email` (`company_id`, `email`);
