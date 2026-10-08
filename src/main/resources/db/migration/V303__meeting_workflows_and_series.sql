CREATE TABLE meeting_flows (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 company_id BIGINT NOT NULL,
 name VARCHAR(120) NOT NULL,
 settings_json JSON NOT NULL,
 created_by BIGINT NOT NULL,
 archived_at DATETIME(6) NULL,
 archived_by BIGINT NULL,
 version BIGINT NOT NULL DEFAULT 1,
 created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 UNIQUE KEY uq_meeting_flow_tenant(company_id,id),
 KEY idx_meeting_flow_owner(company_id,created_by,archived_at),
 CONSTRAINT fk_meeting_flow_company FOREIGN KEY(company_id) REFERENCES companies(id),
 CONSTRAINT fk_meeting_flow_creator FOREIGN KEY(created_by) REFERENCES users(id)
);
CREATE TABLE meeting_series (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 company_id BIGINT NOT NULL,
 title VARCHAR(180) NOT NULL,
 frequency VARCHAR(16) NOT NULL,
 interval_value INT NOT NULL,
 occurrence_count INT NOT NULL,
 timezone VARCHAR(80) NOT NULL,
 owner_id BIGINT NOT NULL,
 reminders_paused TINYINT(1) NOT NULL DEFAULT 0,
 status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE',
 version BIGINT NOT NULL DEFAULT 1,
 created_by BIGINT NOT NULL,
 created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 UNIQUE KEY uq_meeting_series_tenant(company_id,id),
 KEY idx_meeting_series_owner(company_id,owner_id,status),
 CONSTRAINT fk_meeting_series_company FOREIGN KEY(company_id) REFERENCES companies(id),
 CONSTRAINT fk_meeting_series_owner FOREIGN KEY(owner_id) REFERENCES users(id)
);
ALTER TABLE meeting_records
 ADD COLUMN objective VARCHAR(1000) NOT NULL DEFAULT '',
 ADD COLUMN expected_result VARCHAR(1000) NOT NULL DEFAULT '',
 ADD COLUMN minutes_owner_id BIGINT NULL,
 ADD COLUMN reminder_minutes INT NOT NULL DEFAULT 0,
 ADD COLUMN series_id BIGINT NULL,
 ADD COLUMN flow_id BIGINT NULL,
 ADD COLUMN occurrence_number INT NULL,
 ADD UNIQUE KEY uq_meeting_occurrence(company_id,series_id,occurrence_number),
 ADD CONSTRAINT fk_meeting_minutes_owner FOREIGN KEY(minutes_owner_id) REFERENCES users(id),
 ADD CONSTRAINT fk_meeting_series FOREIGN KEY(company_id,series_id) REFERENCES meeting_series(company_id,id),
 ADD CONSTRAINT fk_meeting_record_flow FOREIGN KEY(company_id,flow_id) REFERENCES meeting_flows(company_id,id);
-- Legacy meetings retain their coordinator as minutes owner through COALESCE on reads.
-- Series are finite: planning atomically materializes all reviewed occurrences, no implicit grants.
CREATE TABLE meeting_reminder_receipts (
 company_id BIGINT NOT NULL,
 meeting_id BIGINT NOT NULL,
 recipient_user_id BIGINT NOT NULL,
 signal_type VARCHAR(24) NOT NULL,
 signal_key VARCHAR(120) NOT NULL,
 delivered_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 PRIMARY KEY(company_id,meeting_id,recipient_user_id,signal_type,signal_key),
 CONSTRAINT fk_meeting_reminder_record FOREIGN KEY(company_id,meeting_id) REFERENCES meeting_records(company_id,id),
 CONSTRAINT fk_meeting_reminder_user FOREIGN KEY(recipient_user_id) REFERENCES users(id)
);
CREATE TABLE meeting_workflow_audit (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 company_id BIGINT NOT NULL,
 entity_type VARCHAR(16) NOT NULL,
 entity_id BIGINT NOT NULL,
 action VARCHAR(40) NOT NULL,
 actor_id BIGINT NOT NULL,
 occurred_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 KEY idx_meeting_workflow_audit(company_id,entity_type,entity_id,id),
 CONSTRAINT fk_meeting_workflow_audit_company FOREIGN KEY(company_id) REFERENCES companies(id)
);
