CREATE TABLE IF NOT EXISTS process_task_assignees (
    id BIGINT NOT NULL AUTO_INCREMENT,
    company_id BIGINT NOT NULL,
    task_id BIGINT NOT NULL,
    user_company_id BIGINT NOT NULL,
    assignment_role VARCHAR(24) NOT NULL DEFAULT 'collaborator',
    contribution_status VARCHAR(24) NOT NULL DEFAULT 'pending',
    required_for_completion TINYINT(1) NOT NULL DEFAULT 1,
    assigned_by_user_company_id BIGINT NULL,
    assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ready_at DATETIME NULL,
    removed_at DATETIME NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_process_task_assignee (company_id, task_id, user_company_id),
    KEY idx_process_task_assignees_user (company_id, user_company_id, removed_at),
    KEY idx_process_task_assignees_task (company_id, task_id, removed_at),
    CONSTRAINT fk_process_task_assignees_company
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_process_task_assignees_task
        FOREIGN KEY (task_id) REFERENCES process_tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_process_task_assignees_user_company
        FOREIGN KEY (user_company_id) REFERENCES user_companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_process_task_assignees_assigned_by
        FOREIGN KEY (assigned_by_user_company_id) REFERENCES user_companies(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS process_task_events (
    id BIGINT NOT NULL AUTO_INCREMENT,
    company_id BIGINT NOT NULL,
    task_id BIGINT NOT NULL,
    event_type VARCHAR(48) NOT NULL,
    actor_user_company_id BIGINT NULL,
    subject_user_company_id BIGINT NULL,
    detail VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_process_task_events_task (company_id, task_id, created_at, id),
    KEY idx_process_task_events_actor (company_id, actor_user_company_id, created_at),
    CONSTRAINT fk_process_task_events_company
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_process_task_events_task
        FOREIGN KEY (task_id) REFERENCES process_tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_process_task_events_actor
        FOREIGN KEY (actor_user_company_id) REFERENCES user_companies(id) ON DELETE SET NULL,
    CONSTRAINT fk_process_task_events_subject
        FOREIGN KEY (subject_user_company_id) REFERENCES user_companies(id) ON DELETE SET NULL
);

INSERT INTO process_task_assignees (
    company_id,
    task_id,
    user_company_id,
    assignment_role,
    contribution_status,
    required_for_completion,
    assigned_by_user_company_id,
    assigned_at
)
SELECT task.company_id,
       task.id,
       task.assigned_user_company_id,
       'lead',
       CASE WHEN task.status = 'completed' THEN 'ready' ELSE 'pending' END,
       1,
       creator_company.id,
       task.created_at
FROM process_tasks task
LEFT JOIN user_companies creator_company
  ON creator_company.company_id = task.company_id
 AND creator_company.user_id = task.created_by
WHERE task.assigned_user_company_id IS NOT NULL
ON DUPLICATE KEY UPDATE
    assignment_role = VALUES(assignment_role),
    removed_at = NULL,
    updated_at = CURRENT_TIMESTAMP;
