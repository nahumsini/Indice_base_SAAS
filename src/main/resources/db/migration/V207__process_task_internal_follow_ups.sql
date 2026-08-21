CREATE TABLE IF NOT EXISTS process_task_follow_ups (
    id BIGINT NOT NULL AUTO_INCREMENT,
    company_id BIGINT NOT NULL,
    task_id BIGINT NOT NULL,
    author_user_company_id BIGINT NULL,
    follow_up_date DATE NOT NULL,
    entry_type VARCHAR(24) NOT NULL DEFAULT 'update',
    comment TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_process_task_follow_ups_task (company_id, task_id, created_at, id),
    KEY idx_process_task_follow_ups_date (company_id, follow_up_date, task_id),
    CONSTRAINT fk_process_task_follow_ups_company
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_process_task_follow_ups_task
        FOREIGN KEY (task_id) REFERENCES process_tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_process_task_follow_ups_author
        FOREIGN KEY (author_user_company_id) REFERENCES user_companies(id) ON DELETE SET NULL
);

INSERT INTO process_task_follow_ups (
    company_id,
    task_id,
    author_user_company_id,
    follow_up_date,
    entry_type,
    comment,
    created_at,
    updated_at
)
SELECT task.company_id,
       task.id,
       creator_company.id,
       COALESCE(task.due_date, task.start_date, DATE(task.created_at), CURRENT_DATE),
       'update',
       task.notes,
       COALESCE(task.updated_at, task.created_at, CURRENT_TIMESTAMP),
       COALESCE(task.updated_at, task.created_at, CURRENT_TIMESTAMP)
FROM process_tasks task
LEFT JOIN user_companies creator_company
  ON creator_company.company_id = task.company_id
 AND creator_company.user_id = task.created_by
WHERE task.notes IS NOT NULL
  AND TRIM(task.notes) <> '';
