UPDATE modules SET name='Control de juntas', description='Juntas, minutas, decisiones y acuerdos con seguimiento.',
 lifecycle_status='pilot', access_model='tabs', assignment_enabled=1, badge_text='Pilot',
 route_key='minutes-control', icon='bi-journal-check'
 WHERE slug='control_minutas';
-- Registration creates no tenant entitlements, user assignments or billing prices.
CREATE TABLE meeting_records (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 company_id BIGINT NOT NULL,
 title VARCHAR(180) NOT NULL,
 meeting_type VARCHAR(24) NOT NULL,
 status VARCHAR(24) NOT NULL DEFAULT 'PLANNED',
 start_at DATETIME(6) NOT NULL,
 end_at DATETIME(6) NOT NULL,
 timezone VARCHAR(80) NOT NULL,
 owner_id BIGINT NOT NULL,
 agenda TEXT NOT NULL,
 location VARCHAR(240) NOT NULL DEFAULT '',
 minutes TEXT NOT NULL,
 decisions TEXT NOT NULL,
 version BIGINT NOT NULL DEFAULT 1,
 created_by BIGINT NOT NULL,
 created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 UNIQUE KEY uq_meeting_tenant (company_id,id),
 KEY idx_meeting_date (company_id,start_at,status),
 CONSTRAINT fk_meeting_company FOREIGN KEY (company_id) REFERENCES companies(id),
 CONSTRAINT fk_meeting_owner FOREIGN KEY (owner_id) REFERENCES users(id)
);
CREATE TABLE meeting_participants (
 company_id BIGINT NOT NULL,
 meeting_id BIGINT NOT NULL,
 user_id BIGINT NOT NULL,
 PRIMARY KEY(company_id,meeting_id,user_id),
 KEY idx_meeting_participant (company_id,user_id,meeting_id),
 CONSTRAINT fk_meeting_participant_record FOREIGN KEY(company_id,meeting_id) REFERENCES meeting_records(company_id,id),
 CONSTRAINT fk_meeting_participant_user FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE meeting_agreements (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 company_id BIGINT NOT NULL,
 meeting_id BIGINT NOT NULL,
 title VARCHAR(240) NOT NULL,
 assignee_id BIGINT NOT NULL,
 due_date DATE NOT NULL,
 status VARCHAR(24) NOT NULL DEFAULT 'OPEN',
 resolution VARCHAR(2000) NOT NULL DEFAULT '',
 version BIGINT NOT NULL DEFAULT 1,
 created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 UNIQUE KEY uq_meeting_agreement_tenant(company_id,id),
 KEY idx_meeting_agreement_due(company_id,due_date,status),
 CONSTRAINT fk_meeting_agreement_record FOREIGN KEY(company_id,meeting_id) REFERENCES meeting_records(company_id,id),
 CONSTRAINT fk_meeting_agreement_user FOREIGN KEY(assignee_id) REFERENCES users(id)
);
CREATE TABLE meeting_audit (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 company_id BIGINT NOT NULL,
 meeting_id BIGINT NOT NULL,
 agreement_id BIGINT NULL,
 action VARCHAR(40) NOT NULL,
 actor_id BIGINT NOT NULL,
 reason VARCHAR(2000) NOT NULL DEFAULT '',
 occurred_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 KEY idx_meeting_audit(company_id,meeting_id,id),
 CONSTRAINT fk_meeting_audit_record FOREIGN KEY(company_id,meeting_id) REFERENCES meeting_records(company_id,id),
 CONSTRAINT fk_meeting_audit_agreement FOREIGN KEY(company_id,agreement_id) REFERENCES meeting_agreements(company_id,id)
);
CREATE TABLE meeting_create_replays (
 company_id BIGINT NOT NULL,
 actor_id BIGINT NOT NULL,
 request_key VARCHAR(80) NOT NULL,
 entity_type VARCHAR(16) NOT NULL,
 entity_id BIGINT NOT NULL,
 fingerprint CHAR(64) NOT NULL,
 PRIMARY KEY(company_id,actor_id,entity_type,request_key),
 CONSTRAINT fk_meeting_replay_company FOREIGN KEY(company_id) REFERENCES companies(id)
);
