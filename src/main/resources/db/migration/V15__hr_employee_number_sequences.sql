CREATE TABLE IF NOT EXISTS `hr_employee_number_sequences` (
  `company_id` bigint NOT NULL,
  `prefix` varchar(20) NOT NULL DEFAULT 'EMP',
  `padding` int NOT NULL DEFAULT '4',
  `next_number` bigint NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`company_id`),
  CONSTRAINT `fk_hr_employee_number_sequences_company`
    FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

WITH normalized_numbers AS (
  SELECT
    e.`id`,
    e.`company_id`,
    TRIM(COALESCE(e.`employee_number`, '')) AS `normalized_employee_number`,
    ROW_NUMBER() OVER (
      PARTITION BY e.`company_id`, NULLIF(TRIM(COALESCE(e.`employee_number`, '')), '')
      ORDER BY e.`id`
    ) AS `duplicate_rank`
  FROM `hr_employees` e
),
rows_needing_numbers AS (
  SELECT
    n.`id`,
    n.`company_id`,
    ROW_NUMBER() OVER (PARTITION BY n.`company_id` ORDER BY n.`id`) AS `generated_offset`
  FROM normalized_numbers n
  WHERE n.`normalized_employee_number` = ''
     OR n.`duplicate_rank` > 1
),
company_max_numbers AS (
  SELECT
    e.`company_id`,
    COALESCE(MAX(
      CASE
        WHEN TRIM(COALESCE(e.`employee_number`, '')) REGEXP '^EMP-[0-9]+$'
          THEN CAST(SUBSTRING(TRIM(e.`employee_number`), 5) AS UNSIGNED)
        ELSE 0
      END
    ), 0) AS `max_existing_number`
  FROM `hr_employees` e
  GROUP BY e.`company_id`
)
UPDATE `hr_employees` e
JOIN rows_needing_numbers r ON r.`id` = e.`id`
JOIN company_max_numbers m ON m.`company_id` = r.`company_id`
SET e.`employee_number` = CONCAT('EMP-', LPAD(m.`max_existing_number` + r.`generated_offset`, 4, '0'));

INSERT INTO `hr_employee_number_sequences` (`company_id`, `prefix`, `padding`, `next_number`)
SELECT
  c.`id`,
  'EMP',
  4,
  COALESCE((
    SELECT MAX(
      CASE
        WHEN TRIM(COALESCE(e.`employee_number`, '')) REGEXP '^EMP-[0-9]+$'
          THEN CAST(SUBSTRING(TRIM(e.`employee_number`), 5) AS UNSIGNED)
        ELSE 0
      END
    )
    FROM `hr_employees` e
    WHERE e.`company_id` = c.`id`
  ), 0) + 1
FROM `companies` c
ON DUPLICATE KEY UPDATE
  `prefix` = VALUES(`prefix`),
  `padding` = VALUES(`padding`),
  `next_number` = GREATEST(`hr_employee_number_sequences`.`next_number`, VALUES(`next_number`));

ALTER TABLE `hr_employees`
  ADD UNIQUE KEY `uq_hr_employees_company_employee_number` (`company_id`, `employee_number`);
