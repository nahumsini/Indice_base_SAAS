-- Additive task origin links. Neither assignment nor link mutates chat/CRM/task ownership.
CREATE TABLE sales_conversation_tasks (
 company_id BIGINT NOT NULL,conversation_id CHAR(36) NOT NULL,task_id BIGINT NOT NULL,
 created_by_membership_id BIGINT NOT NULL,created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 PRIMARY KEY(company_id,conversation_id,task_id),
 FOREIGN KEY(company_id,conversation_id) REFERENCES sales_conversations(company_id,id)
) ENGINE=InnoDB;
