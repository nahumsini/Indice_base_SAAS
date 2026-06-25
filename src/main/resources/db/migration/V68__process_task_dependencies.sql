CREATE TABLE IF NOT EXISTS process_task_dependencies (
  id BIGINT NOT NULL AUTO_INCREMENT,
  company_id BIGINT NOT NULL,
  predecessor_task_id BIGINT NOT NULL,
  successor_task_id BIGINT NOT NULL,
  dependency_type VARCHAR(40) NOT NULL DEFAULT 'finish_to_start',
  lag_days INT NOT NULL DEFAULT 0,
  created_by BIGINT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_process_task_dependencies_successor_fk (successor_task_id),
  KEY idx_process_task_dependencies_predecessor_fk (predecessor_task_id),
  KEY idx_process_task_dependencies_created_by_fk (created_by),
  KEY idx_process_task_dependencies_successor (company_id, successor_task_id, deleted_at),
  KEY idx_process_task_dependencies_predecessor (company_id, predecessor_task_id, deleted_at),
  CONSTRAINT fk_process_task_dependencies_company
    FOREIGN KEY (company_id) REFERENCES companies(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_process_task_dependencies_predecessor
    FOREIGN KEY (predecessor_task_id) REFERENCES process_tasks(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_process_task_dependencies_successor
    FOREIGN KEY (successor_task_id) REFERENCES process_tasks(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_process_task_dependencies_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL
);
