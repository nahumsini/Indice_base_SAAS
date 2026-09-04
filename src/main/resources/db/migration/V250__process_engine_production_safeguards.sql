CREATE TABLE process_task_document_sequences (
  company_id BIGINT NOT NULL,
  document_type VARCHAR(24) NOT NULL,
  sequence_year INT NOT NULL,
  current_value INT NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (company_id, document_type, sequence_year),
  CONSTRAINT fk_process_task_document_sequences_company
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

ALTER TABLE processes
  ADD COLUMN materialization_failure_count INT NOT NULL DEFAULT 0 AFTER last_materialized_at,
  ADD COLUMN materialization_retry_at DATETIME NULL AFTER materialization_failure_count,
  ADD COLUMN materialization_last_failed_at DATETIME NULL AFTER materialization_retry_at,
  ADD COLUMN materialization_last_error VARCHAR(500) NULL AFTER materialization_last_failed_at,
  ADD INDEX idx_processes_materialization_retry
    (is_active, activation_mode, materialization_retry_at, generated_until_date);
