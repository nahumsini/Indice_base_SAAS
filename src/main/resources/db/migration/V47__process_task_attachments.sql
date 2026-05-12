CREATE TABLE IF NOT EXISTS process_task_attachments (
  id BIGINT NOT NULL AUTO_INCREMENT,
  company_id BIGINT NOT NULL,
  task_id BIGINT NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  size_bytes BIGINT NOT NULL,
  object_key VARCHAR(512) NOT NULL,
  uploaded_by_user_id BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_process_task_attachments_object_key (company_id, object_key),
  KEY idx_process_task_attachments_task (task_id),
  KEY idx_process_task_attachments_company_deleted (company_id, deleted_at),
  CONSTRAINT fk_process_task_attachments_company
    FOREIGN KEY (company_id) REFERENCES companies(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_process_task_attachments_task
    FOREIGN KEY (task_id) REFERENCES process_tasks(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_process_task_attachments_uploaded_by_user
    FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id)
    ON DELETE RESTRICT
);
