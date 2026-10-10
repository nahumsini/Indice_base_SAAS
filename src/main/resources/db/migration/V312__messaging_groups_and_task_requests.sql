-- Team chat extends the existing participant/read-cursor owner; no second message store.
ALTER TABLE messaging_conversations DROP CHECK ck_messaging_kind,
    ADD CONSTRAINT ck_messaging_kind CHECK (kind IN ('DIRECT','GROUP','SUPPORT','DISTRIBUTOR'));

-- Company-owned retry receipts. Task content/lifecycle remain owned by Processes and Tasks.
CREATE TABLE messaging_task_requests (
    company_id BIGINT NOT NULL,
    membership_id BIGINT NOT NULL,
    request_key CHAR(36) NOT NULL,
    conversation_id BIGINT NOT NULL,
    task_id BIGINT NOT NULL,
    fingerprint CHAR(64) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY(company_id,membership_id,request_key),
    FOREIGN KEY(company_id) REFERENCES companies(id),
    FOREIGN KEY(membership_id) REFERENCES user_companies(id),
    FOREIGN KEY(conversation_id) REFERENCES messaging_conversations(id),
    FOREIGN KEY(task_id) REFERENCES process_tasks(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
