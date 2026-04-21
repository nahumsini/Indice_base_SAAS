CREATE TABLE IF NOT EXISTS `hr_employee_profiles` (
  `employee_id` bigint NOT NULL,
  `company_id` bigint NOT NULL,
  `date_of_birth` date DEFAULT NULL,
  `address` text DEFAULT NULL,
  `national_id` varchar(80) DEFAULT NULL,
  `tax_id` varchar(80) DEFAULT NULL,
  `social_security_number` varchar(80) DEFAULT NULL,
  `registration_country` varchar(2) DEFAULT NULL,
  `state_province` varchar(120) DEFAULT NULL,
  `alternate_phone` varchar(50) DEFAULT NULL,
  `emergency_contact_name` varchar(120) DEFAULT NULL,
  `emergency_contact_relationship` varchar(80) DEFAULT NULL,
  `emergency_contact_phone` varchar(50) DEFAULT NULL,
  `workday_hours` decimal(5,2) NOT NULL DEFAULT '8.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`employee_id`),
  KEY `idx_hr_employee_profiles_company` (`company_id`),
  CONSTRAINT `fk_hr_employee_profiles_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_employee_profiles_employee` FOREIGN KEY (`employee_id`) REFERENCES `hr_employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `hr_employee_documents` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `employee_id` bigint NOT NULL,
  `document_type` varchar(40) NOT NULL,
  `original_filename` varchar(255) NOT NULL,
  `mime_type` varchar(120) NOT NULL,
  `size_bytes` bigint NOT NULL DEFAULT '0',
  `object_key` varchar(255) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `uploaded_by_user_id` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_hr_employee_documents_employee_type` (`company_id`, `employee_id`, `document_type`),
  UNIQUE KEY `uq_hr_employee_documents_object_key` (`company_id`, `object_key`),
  KEY `idx_hr_employee_documents_company_employee` (`company_id`, `employee_id`),
  CONSTRAINT `fk_hr_employee_documents_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_employee_documents_employee` FOREIGN KEY (`employee_id`) REFERENCES `hr_employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_employee_documents_uploaded_by` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `hr_employee_portal_access` (
  `employee_id` bigint NOT NULL,
  `company_id` bigint NOT NULL,
  `access_role` varchar(40) NOT NULL DEFAULT 'employee',
  `linked_user_id` bigint DEFAULT NULL,
  `invitation_id` bigint DEFAULT NULL,
  `invitation_status` varchar(20) NOT NULL DEFAULT 'not_invited',
  `last_invited_at` datetime DEFAULT NULL,
  `created_by` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`employee_id`),
  KEY `idx_hr_employee_portal_access_company_role` (`company_id`, `access_role`),
  KEY `idx_hr_employee_portal_access_linked_user` (`linked_user_id`),
  KEY `idx_hr_employee_portal_access_invitation` (`invitation_id`),
  CONSTRAINT `fk_hr_employee_portal_access_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_employee_portal_access_employee` FOREIGN KEY (`employee_id`) REFERENCES `hr_employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hr_employee_portal_access_linked_user` FOREIGN KEY (`linked_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_hr_employee_portal_access_invitation` FOREIGN KEY (`invitation_id`) REFERENCES `user_invitations` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `hr_employee_profiles`
(`employee_id`, `company_id`, `workday_hours`)
SELECT e.`id`, e.`company_id`, 8.00
FROM `hr_employees` e
WHERE NOT EXISTS (
  SELECT 1
  FROM `hr_employee_profiles` p
  WHERE p.`employee_id` = e.`id`
);

INSERT INTO `hr_employee_portal_access`
(`employee_id`, `company_id`, `access_role`, `linked_user_id`, `invitation_status`, `created_by`)
SELECT e.`id`,
       e.`company_id`,
       'employee',
       (
         SELECT uc.`user_id`
         FROM `users` u
         INNER JOIN `user_companies` uc ON uc.`user_id` = u.`id`
         WHERE uc.`company_id` = e.`company_id`
           AND LOWER(u.`email`) = LOWER(e.`email`)
         LIMIT 1
       ) AS `linked_user_id`,
       CASE
         WHEN EXISTS (
           SELECT 1
           FROM `users` u
           INNER JOIN `user_companies` uc ON uc.`user_id` = u.`id`
           WHERE uc.`company_id` = e.`company_id`
             AND LOWER(u.`email`) = LOWER(e.`email`)
         ) THEN 'linked'
         ELSE 'not_invited'
       END AS `invitation_status`,
       e.`created_by`
FROM `hr_employees` e
WHERE NOT EXISTS (
  SELECT 1
  FROM `hr_employee_portal_access` a
  WHERE a.`employee_id` = e.`id`
);
