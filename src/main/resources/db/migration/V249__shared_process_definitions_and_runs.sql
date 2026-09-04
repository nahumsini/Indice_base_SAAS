ALTER TABLE processes
  ADD COLUMN distribution_mode VARCHAR(24) NOT NULL DEFAULT 'individual' AFTER evidence_required,
  ADD COLUMN activation_mode VARCHAR(24) NOT NULL DEFAULT 'recurring' AFTER distribution_mode,
  ADD COLUMN organization_mode VARCHAR(24) NOT NULL DEFAULT 'parallel' AFTER activation_mode,
  ADD COLUMN include_weekends TINYINT(1) NOT NULL DEFAULT 1 AFTER organization_mode,
  ADD COLUMN coordinator_user_company_id BIGINT NULL AFTER responsible_user_company_id,
  ADD COLUMN current_version INT NOT NULL DEFAULT 1 AFTER coordinator_user_company_id,
  ADD KEY idx_processes_company_activation (company_id, activation_mode, is_active),
  ADD KEY idx_processes_coordinator (coordinator_user_company_id),
  ADD CONSTRAINT fk_processes_coordinator_user_company
    FOREIGN KEY (coordinator_user_company_id) REFERENCES user_companies(id) ON DELETE SET NULL;

UPDATE processes
SET coordinator_user_company_id = creator_user_company_id
WHERE coordinator_user_company_id IS NULL;

CREATE TABLE process_versions (
  id BIGINT NOT NULL AUTO_INCREMENT,
  company_id BIGINT NOT NULL,
  process_id BIGINT NOT NULL,
  version_number INT NOT NULL,
  title VARCHAR(220) NOT NULL,
  description TEXT NOT NULL,
  distribution_mode VARCHAR(24) NOT NULL,
  activation_mode VARCHAR(24) NOT NULL,
  organization_mode VARCHAR(24) NOT NULL,
  include_weekends TINYINT(1) NOT NULL DEFAULT 1,
  default_priority VARCHAR(30) NOT NULL DEFAULT 'medium',
  default_unit_id BIGINT NULL,
  default_business_id BIGINT NULL,
  coordinator_user_company_id BIGINT NULL,
  frequency VARCHAR(40) NOT NULL,
  recurrence_json JSON NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  published_by BIGINT NULL,
  published_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_process_versions_process_number (company_id, process_id, version_number),
  KEY idx_process_versions_process (company_id, process_id, published_at),
  CONSTRAINT fk_process_versions_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_process_versions_process FOREIGN KEY (process_id) REFERENCES processes(id) ON DELETE CASCADE,
  CONSTRAINT fk_process_versions_coordinator FOREIGN KEY (coordinator_user_company_id) REFERENCES user_companies(id) ON DELETE SET NULL
);

CREATE TABLE process_task_templates (
  id BIGINT NOT NULL AUTO_INCREMENT,
  company_id BIGINT NOT NULL,
  process_id BIGINT NOT NULL,
  process_version_id BIGINT NOT NULL,
  position_number INT NOT NULL,
  stage_number INT NOT NULL DEFAULT 1,
  title VARCHAR(220) NOT NULL,
  description TEXT NULL,
  notes TEXT NULL,
  priority VARCHAR(30) NOT NULL DEFAULT 'medium',
  unit_id BIGINT NULL,
  business_id BIGINT NULL,
  scheduled_offset_days INT NOT NULL DEFAULT 0,
  deadline_offset_days INT NOT NULL DEFAULT 0,
  evidence_required TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_process_task_templates_position (company_id, process_version_id, position_number),
  KEY idx_process_task_templates_process (company_id, process_id, process_version_id),
  CONSTRAINT fk_process_task_templates_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_process_task_templates_process FOREIGN KEY (process_id) REFERENCES processes(id) ON DELETE CASCADE,
  CONSTRAINT fk_process_task_templates_version FOREIGN KEY (process_version_id) REFERENCES process_versions(id) ON DELETE CASCADE
);

CREATE TABLE process_task_template_assignees (
  id BIGINT NOT NULL AUTO_INCREMENT,
  company_id BIGINT NOT NULL,
  template_id BIGINT NOT NULL,
  user_company_id BIGINT NOT NULL,
  position_number INT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_process_template_assignee (company_id, template_id, user_company_id),
  KEY idx_process_template_assignees_user (company_id, user_company_id),
  CONSTRAINT fk_process_template_assignees_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_process_template_assignees_template FOREIGN KEY (template_id) REFERENCES process_task_templates(id) ON DELETE CASCADE,
  CONSTRAINT fk_process_template_assignees_user FOREIGN KEY (user_company_id) REFERENCES user_companies(id) ON DELETE CASCADE
);

CREATE TABLE process_runs (
  id BIGINT NOT NULL AUTO_INCREMENT,
  company_id BIGINT NOT NULL,
  process_id BIGINT NOT NULL,
  process_version_id BIGINT NOT NULL,
  folio VARCHAR(48) NOT NULL,
  run_number INT NOT NULL,
  activation_mode VARCHAR(24) NOT NULL,
  reference VARCHAR(220) NOT NULL,
  reference_normalized VARCHAR(220) NOT NULL,
  notes TEXT NULL,
  start_date DATE NOT NULL,
  occurrence_date DATE NULL,
  coordinator_user_company_id BIGINT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'pending',
  requires_attention TINYINT(1) NOT NULL DEFAULT 0,
  has_delays TINYINT(1) NOT NULL DEFAULT 0,
  idempotency_key VARCHAR(120) NULL,
  legacy_task_id BIGINT NULL,
  created_by BIGINT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  finalized_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_process_runs_company_folio (company_id, folio),
  UNIQUE KEY uk_process_runs_number (company_id, process_id, run_number),
  UNIQUE KEY uk_process_runs_recurring_occurrence (company_id, process_id, occurrence_date),
  UNIQUE KEY uk_process_runs_idempotency (company_id, idempotency_key),
  UNIQUE KEY uk_process_runs_legacy_task (company_id, legacy_task_id),
  KEY idx_process_runs_process (company_id, process_id, created_at),
  KEY idx_process_runs_status (company_id, status, start_date),
  CONSTRAINT fk_process_runs_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_process_runs_process FOREIGN KEY (process_id) REFERENCES processes(id) ON DELETE RESTRICT,
  CONSTRAINT fk_process_runs_version FOREIGN KEY (process_version_id) REFERENCES process_versions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_process_runs_coordinator FOREIGN KEY (coordinator_user_company_id) REFERENCES user_companies(id) ON DELETE SET NULL,
  CONSTRAINT fk_process_runs_legacy_task FOREIGN KEY (legacy_task_id) REFERENCES process_tasks(id) ON DELETE SET NULL
);

ALTER TABLE process_tasks
  ADD COLUMN process_run_id BIGINT NULL AFTER process_id,
  ADD COLUMN process_task_template_id BIGINT NULL AFTER process_run_id,
  ADD COLUMN evidence_required TINYINT(1) NOT NULL DEFAULT 0 AFTER process_task_template_id,
  ADD COLUMN completion_policy VARCHAR(32) NOT NULL DEFAULT 'lead' AFTER evidence_required,
  ADD KEY idx_process_tasks_run (company_id, process_run_id),
  ADD KEY idx_process_tasks_template (company_id, process_task_template_id),
  ADD CONSTRAINT fk_process_tasks_run FOREIGN KEY (process_run_id) REFERENCES process_runs(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_process_tasks_template FOREIGN KEY (process_task_template_id) REFERENCES process_task_templates(id) ON DELETE SET NULL;

INSERT INTO process_versions (
  company_id, process_id, version_number, title, description, distribution_mode, activation_mode,
  organization_mode, include_weekends, default_priority, default_unit_id, default_business_id,
  coordinator_user_company_id, frequency, recurrence_json, start_date, end_date, published_by, published_at
)
SELECT company_id, id, 1, title, description, 'individual', 'recurring', 'parallel', 1,
       priority, unit_id, business_id, coordinator_user_company_id, frequency, recurrence_json,
       start_date, end_date, creator_user_id, created_at
FROM processes;

INSERT INTO process_task_templates (
  company_id, process_id, process_version_id, position_number, stage_number, title, description,
  notes, priority, unit_id, business_id, scheduled_offset_days, deadline_offset_days,
  evidence_required, created_at
)
SELECT process.company_id, process.id, version.id, 1, 1,
       COALESCE(NULLIF(TRIM(process.task_title_template), ''), process.title),
       COALESCE(NULLIF(TRIM(process.task_description_template), ''), process.description),
       process.task_notes_template, process.priority, process.unit_id, process.business_id,
       0, GREATEST(process.grace_days, 0), process.evidence_required, process.created_at
FROM processes process
JOIN process_versions version
  ON version.company_id = process.company_id
 AND version.process_id = process.id
 AND version.version_number = 1;

INSERT INTO process_task_template_assignees (company_id, template_id, user_company_id, position_number)
SELECT template.company_id, template.id, process.responsible_user_company_id, 1
FROM process_task_templates template
JOIN processes process
  ON process.company_id = template.company_id
 AND process.id = template.process_id
WHERE process.responsible_user_company_id IS NOT NULL;

INSERT INTO process_runs (
  company_id, process_id, process_version_id, folio, run_number, activation_mode, reference,
  reference_normalized, start_date, occurrence_date, coordinator_user_company_id, status,
  has_delays, legacy_task_id, created_by, created_at, finalized_at
)
SELECT task.company_id, task.process_id, version.id,
       CONCAT('RUN-', task.id),
       ROW_NUMBER() OVER (PARTITION BY task.company_id, task.process_id ORDER BY task.id),
       'recurring',
       CONCAT(COALESCE(DATE_FORMAT(task.start_date, '%Y-%m-%d'), DATE_FORMAT(task.due_date, '%Y-%m-%d'), task.folio)),
       LOWER(CONCAT(COALESCE(DATE_FORMAT(task.start_date, '%Y-%m-%d'), DATE_FORMAT(task.due_date, '%Y-%m-%d'), task.folio))),
       COALESCE(task.start_date, task.due_date, DATE(task.created_at)),
       CASE WHEN ROW_NUMBER() OVER (
         PARTITION BY task.company_id, task.process_id, COALESCE(task.start_date, task.due_date, DATE(task.created_at))
         ORDER BY task.id
       ) = 1 THEN COALESCE(task.start_date, task.due_date, DATE(task.created_at)) ELSE NULL END,
       process.coordinator_user_company_id,
       CASE
         WHEN task.status = 'cancelled' THEN 'finalized_with_incidents'
         WHEN task.status = 'completed' THEN 'finalized'
         WHEN task.status IN ('in_progress', 'paused') THEN 'in_progress'
         ELSE 'pending'
       END,
       CASE WHEN task.due_date < CURRENT_DATE AND task.status NOT IN ('completed', 'cancelled') THEN 1 ELSE 0 END,
       task.id, task.created_by, task.created_at,
       CASE WHEN task.status IN ('completed', 'cancelled') THEN COALESCE(task.completed_at, task.cancelled_at, task.updated_at) ELSE NULL END
FROM process_tasks task
JOIN processes process
  ON process.company_id = task.company_id
 AND process.id = task.process_id
JOIN process_versions version
  ON version.company_id = process.company_id
 AND version.process_id = process.id
 AND version.version_number = 1
WHERE task.process_id IS NOT NULL
  AND task.deleted_at IS NULL;

UPDATE process_tasks task
JOIN process_runs run
  ON run.company_id = task.company_id
 AND run.legacy_task_id = task.id
JOIN process_task_templates template
  ON template.company_id = task.company_id
 AND template.process_id = task.process_id
 AND template.process_version_id = run.process_version_id
SET task.process_run_id = run.id,
    task.process_task_template_id = template.id,
    task.evidence_required = template.evidence_required,
    task.completion_policy = 'lead';
