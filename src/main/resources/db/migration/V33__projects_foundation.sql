SET @schema_name = DATABASE();

CREATE TABLE IF NOT EXISTS projects (
  id BIGINT NOT NULL AUTO_INCREMENT,
  company_id BIGINT NOT NULL,
  folio VARCHAR(40) NOT NULL,
  name VARCHAR(220) NOT NULL,
  description TEXT DEFAULT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'active',
  priority VARCHAR(50) DEFAULT NULL,
  owner_user_id BIGINT DEFAULT NULL,
  owner_employee_id BIGINT DEFAULT NULL,
  owner_name VARCHAR(180) DEFAULT NULL,
  business_id BIGINT DEFAULT NULL,
  unit_id BIGINT DEFAULT NULL,
  start_date DATE DEFAULT NULL,
  due_date DATE DEFAULT NULL,
  completed_at DATETIME DEFAULT NULL,
  cancelled_at DATETIME DEFAULT NULL,
  created_by BIGINT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_projects_company_folio (company_id, folio),
  KEY idx_projects_company_status (company_id, status),
  KEY idx_projects_company_due_date (company_id, due_date),
  KEY idx_projects_owner_user (owner_user_id),
  KEY idx_projects_owner_employee (owner_employee_id),
  KEY idx_projects_business (business_id),
  KEY idx_projects_unit (unit_id),
  CONSTRAINT fk_projects_company
    FOREIGN KEY (company_id) REFERENCES companies(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_projects_owner_employee
    FOREIGN KEY (owner_employee_id) REFERENCES hr_employees(id)
    ON DELETE SET NULL
);

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'process_tasks'
          AND INDEX_NAME = 'idx_process_tasks_project'
    ),
    'SELECT 1',
    'ALTER TABLE process_tasks ADD INDEX idx_process_tasks_project (project_id)'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE process_tasks pt
LEFT JOIN projects p ON p.id = pt.project_id
SET pt.project_id = NULL
WHERE pt.project_id IS NOT NULL
  AND p.id IS NULL;

SET @ddl = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'process_tasks'
          AND CONSTRAINT_NAME = 'fk_process_tasks_project'
    ),
    'SELECT 1',
    'ALTER TABLE process_tasks ADD CONSTRAINT fk_process_tasks_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
