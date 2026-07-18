ALTER TABLE process_task_kiosks
    ADD COLUMN expires_at TIMESTAMP NULL AFTER status;
