CREATE TABLE IF NOT EXISTS processes (
  id BIGINT NOT NULL AUTO_INCREMENT,
  company_id BIGINT NOT NULL,
  folio VARCHAR(40) NOT NULL,
  unit_name VARCHAR(160) DEFAULT NULL,
  business_name VARCHAR(160) DEFAULT NULL,
  title VARCHAR(220) NOT NULL,
  description TEXT NOT NULL,
  frequency VARCHAR(40) NOT NULL,
  priority VARCHAR(30) NOT NULL DEFAULT 'medium',
  creator_user_id BIGINT DEFAULT NULL,
  creator_name VARCHAR(180) DEFAULT NULL,
  responsible_name VARCHAR(180) DEFAULT NULL,
  recurrence_json JSON DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_processes_company_folio (company_id, folio),
  KEY idx_processes_company_active (company_id, is_active),
  KEY idx_processes_company_created (company_id, created_at),
  CONSTRAINT fk_processes_company
    FOREIGN KEY (company_id) REFERENCES companies(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS process_tasks (
  id BIGINT NOT NULL AUTO_INCREMENT,
  company_id BIGINT NOT NULL,
  process_id BIGINT DEFAULT NULL,
  folio VARCHAR(40) NOT NULL,
  title VARCHAR(220) NOT NULL,
  description TEXT DEFAULT NULL,
  assigned_employee_id BIGINT DEFAULT NULL,
  assigned_user_id BIGINT DEFAULT NULL,
  assigned_name VARCHAR(180) DEFAULT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'pending',
  due_date DATE DEFAULT NULL,
  completed_at DATETIME DEFAULT NULL,
  created_by BIGINT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_process_tasks_company_folio (company_id, folio),
  KEY idx_process_tasks_company_status (company_id, status),
  KEY idx_process_tasks_process (process_id),
  KEY idx_process_tasks_employee (assigned_employee_id),
  KEY idx_process_tasks_user (assigned_user_id),
  CONSTRAINT fk_process_tasks_company
    FOREIGN KEY (company_id) REFERENCES companies(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_process_tasks_process
    FOREIGN KEY (process_id) REFERENCES processes(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_process_tasks_employee
    FOREIGN KEY (assigned_employee_id) REFERENCES hr_employees(id)
    ON DELETE SET NULL
);
