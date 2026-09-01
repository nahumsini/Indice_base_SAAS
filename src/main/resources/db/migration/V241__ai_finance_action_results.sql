ALTER TABLE ai_action_confirmations
    MODIFY task_title VARCHAR(180) NULL,
    MODIFY task_priority VARCHAR(20) NULL;

ALTER TABLE ai_action_executions
    ADD COLUMN result_json JSON NULL AFTER result_due_date;
