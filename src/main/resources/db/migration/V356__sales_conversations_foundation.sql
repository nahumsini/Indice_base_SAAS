-- Additive private Sales channel. No existing user or invitation receives history access.
CREATE TABLE sales_wa_connections (
 company_id BIGINT NOT NULL, id CHAR(36) NOT NULL, app_id VARCHAR(80) NOT NULL,
 waba_id VARCHAR(80) NOT NULL, phone_number_id VARCHAR(80) NOT NULL, display_phone VARCHAR(24) NOT NULL,
 unit_id BIGINT NULL, business_id BIGINT NULL, status VARCHAR(32) NOT NULL DEFAULT 'CONFIGURING',
 operational_slot TINYINT NULL DEFAULT 1, version BIGINT NOT NULL DEFAULT 1,
 credential_ciphertext TEXT NULL, key_version VARCHAR(40) NULL, verified_at DATETIME(6) NULL,
 last_signal_at DATETIME(6) NULL, reason_code VARCHAR(80) NULL, created_by_membership BIGINT NOT NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 PRIMARY KEY(company_id,id), UNIQUE KEY uq_wa_tenant_number(company_id,operational_slot),
 UNIQUE KEY uq_wa_provider_phone(app_id,phone_number_id),
 CONSTRAINT ck_wa_slot CHECK(operational_slot IS NULL OR operational_slot=1),
 CONSTRAINT ck_wa_connection_state CHECK(status IN ('CONFIGURING','CONNECTED','DEGRADED','RECONNECT_REQUIRED','REVOKED')),
 FOREIGN KEY(company_id) REFERENCES companies(id)
) ENGINE=InnoDB;
CREATE TABLE sales_wa_members (
 company_id BIGINT NOT NULL, connection_id CHAR(36) NOT NULL, membership_id BIGINT NOT NULL,
 capabilities JSON NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE, unit_id BIGINT NULL, business_id BIGINT NULL,
 version BIGINT NOT NULL DEFAULT 1, updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 PRIMARY KEY(company_id,connection_id,membership_id),
 FOREIGN KEY(company_id,connection_id) REFERENCES sales_wa_connections(company_id,id),
 FOREIGN KEY(membership_id) REFERENCES user_companies(id)
) ENGINE=InnoDB;
CREATE TABLE sales_conversations (
 company_id BIGINT NOT NULL, id CHAR(36) NOT NULL, connection_id CHAR(36) NOT NULL,
 peer_id VARCHAR(80) NOT NULL, phone_e164 VARCHAR(24) NOT NULL, status VARCHAR(16) NOT NULL DEFAULT 'OPEN',
 assignee_membership_id BIGINT NULL, contact_id BIGINT NULL, opportunity_id BIGINT NULL,
 version BIGINT NOT NULL DEFAULT 1, change_seq BIGINT NOT NULL DEFAULT 0,
 last_inbound_at DATETIME(6) NULL, last_activity_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 PRIMARY KEY(company_id,id), UNIQUE KEY uq_wa_conversation_peer(company_id,connection_id,peer_id),
 UNIQUE KEY uq_wa_conversation_number(company_id,id,connection_id),
 KEY ix_wa_inbox(company_id,connection_id,status,assignee_membership_id,last_activity_at,id),
 FOREIGN KEY(company_id,connection_id) REFERENCES sales_wa_connections(company_id,id),
 FOREIGN KEY(assignee_membership_id) REFERENCES user_companies(id),
 CONSTRAINT ck_wa_conversation_state CHECK(status IN ('OPEN','RESOLVED'))
) ENGINE=InnoDB;
CREATE TABLE sales_conversation_messages (
 company_id BIGINT NOT NULL, id CHAR(36) NOT NULL, conversation_id CHAR(36) NOT NULL, connection_id CHAR(36) NOT NULL,
 direction VARCHAR(8) NOT NULL, message_type VARCHAR(24) NOT NULL, body TEXT NOT NULL,
 provider_message_id VARCHAR(240) COLLATE utf8mb4_bin NULL, author_membership_id BIGINT NULL,
 dispatch_state VARCHAR(24) NOT NULL, recipient_snapshot VARCHAR(80) NOT NULL, sender_snapshot VARCHAR(80) NOT NULL,
 window_basis_at DATETIME(6) NULL, provider_timestamp DATETIME(6) NULL,
 sent_at DATETIME(6) NULL, delivered_at DATETIME(6) NULL, read_at DATETIME(6) NULL,
 error_code VARCHAR(80) NULL, change_seq BIGINT NOT NULL DEFAULT 0,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 PRIMARY KEY(company_id,id), UNIQUE KEY uq_wa_provider_message(company_id,connection_id,provider_message_id),
 KEY ix_wa_history(company_id,conversation_id,created_at,id),
 FOREIGN KEY(company_id,conversation_id,connection_id) REFERENCES sales_conversations(company_id,id,connection_id),
 CONSTRAINT ck_wa_direction CHECK(direction IN ('IN','OUT')),
 CONSTRAINT ck_wa_dispatch CHECK(dispatch_state IN ('RECEIVED','QUEUED','CLAIMED','SUBMITTING','ACCEPTED','FAILED','UNKNOWN','CANCELLED'))
) ENGINE=InnoDB;
CREATE TABLE sales_conversation_notes (
 company_id BIGINT NOT NULL,id CHAR(36) NOT NULL,conversation_id CHAR(36) NOT NULL,
 author_membership_id BIGINT NOT NULL,body TEXT NOT NULL,change_seq BIGINT NOT NULL,created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 PRIMARY KEY(company_id,id), KEY ix_wa_notes(company_id,conversation_id,created_at,id),
 FOREIGN KEY(company_id,conversation_id) REFERENCES sales_conversations(company_id,id)
) ENGINE=InnoDB;
CREATE TABLE sales_conversation_events (
 seq BIGINT NOT NULL AUTO_INCREMENT,company_id BIGINT NOT NULL,connection_id CHAR(36) NOT NULL,
 conversation_id CHAR(36) NULL,actor_membership_id BIGINT NULL,event_type VARCHAR(40) NOT NULL,
 target_membership_id BIGINT NULL,request_key CHAR(36) NULL,created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 PRIMARY KEY(seq),KEY ix_wa_changes(company_id,connection_id,seq),KEY ix_wa_events(company_id,conversation_id,seq),
 FOREIGN KEY(company_id,connection_id) REFERENCES sales_wa_connections(company_id,id)
) ENGINE=InnoDB;
CREATE TABLE sales_conversation_commands (
 company_id BIGINT NOT NULL,actor_membership_id BIGINT NOT NULL,request_key CHAR(36) NOT NULL,
 conversation_id CHAR(36) NOT NULL,fingerprint CHAR(64) NOT NULL,result_json JSON NOT NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 PRIMARY KEY(company_id,actor_membership_id,request_key),
 FOREIGN KEY(company_id,conversation_id) REFERENCES sales_conversations(company_id,id)
) ENGINE=InnoDB;
CREATE TABLE sales_wa_inbox (
 company_id BIGINT NOT NULL,id CHAR(36) NOT NULL,connection_id CHAR(36) NOT NULL,
 event_key CHAR(64) NOT NULL,payload_ciphertext MEDIUMTEXT NOT NULL,state VARCHAR(16) NOT NULL DEFAULT 'QUEUED',
 fence BIGINT NOT NULL DEFAULT 0,lease_until DATETIME(6) NULL,attempts INT NOT NULL DEFAULT 0,
 next_attempt_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),error_code VARCHAR(80) NULL,
 received_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 PRIMARY KEY(company_id,id),UNIQUE KEY uq_wa_inbox_dedupe(company_id,connection_id,event_key),
 KEY ix_wa_inbox_work(state,next_attempt_at,lease_until),
 FOREIGN KEY(company_id,connection_id) REFERENCES sales_wa_connections(company_id,id),
 CONSTRAINT ck_wa_inbox_state CHECK(state IN ('QUEUED','CLAIMED','DONE','DEAD'))
) ENGINE=InnoDB;
CREATE TABLE sales_wa_status_events (
 company_id BIGINT NOT NULL,connection_id CHAR(36) NOT NULL,event_key CHAR(64) NOT NULL,
 provider_message_id VARCHAR(240) COLLATE utf8mb4_bin NOT NULL,status VARCHAR(24) NOT NULL,
 provider_timestamp DATETIME(6) NOT NULL,received_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 PRIMARY KEY(company_id,connection_id,event_key),KEY ix_wa_status_correlation(company_id,connection_id,provider_message_id),
 FOREIGN KEY(company_id,connection_id) REFERENCES sales_wa_connections(company_id,id)
) ENGINE=InnoDB;
CREATE TABLE sales_wa_outbox (
 company_id BIGINT NOT NULL,message_id CHAR(36) NOT NULL,connection_id CHAR(36) NOT NULL,
 state VARCHAR(24) NOT NULL DEFAULT 'QUEUED',fence BIGINT NOT NULL DEFAULT 0,
 attempt_id CHAR(36) NULL,lease_until DATETIME(6) NULL,next_attempt_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 error_code VARCHAR(80) NULL,created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 PRIMARY KEY(company_id,message_id),KEY ix_wa_outbox_work(state,next_attempt_at,lease_until),
 FOREIGN KEY(company_id,message_id) REFERENCES sales_conversation_messages(company_id,id),
 FOREIGN KEY(company_id,connection_id) REFERENCES sales_wa_connections(company_id,id),
 CONSTRAINT ck_wa_outbox_state CHECK(state IN ('QUEUED','CLAIMED','SUBMITTING','ACCEPTED','FAILED','UNKNOWN','CANCELLED'))
) ENGINE=InnoDB;
CREATE TABLE sales_wa_dispatch_evidence (
 company_id BIGINT NOT NULL,attempt_id CHAR(36) NOT NULL,message_id CHAR(36) NOT NULL,
 outcome VARCHAR(24) NOT NULL,provider_message_id VARCHAR(240) COLLATE utf8mb4_bin NULL,
 error_code VARCHAR(80) NULL,created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 PRIMARY KEY(company_id,attempt_id,outcome), FOREIGN KEY(company_id,message_id) REFERENCES sales_conversation_messages(company_id,id)
) ENGINE=InnoDB;
CREATE TABLE sales_conversation_reads (
 company_id BIGINT NOT NULL,conversation_id CHAR(36) NOT NULL,membership_id BIGINT NOT NULL,
 read_seq BIGINT NOT NULL DEFAULT 0,PRIMARY KEY(company_id,conversation_id,membership_id),
 FOREIGN KEY(company_id,conversation_id) REFERENCES sales_conversations(company_id,id)
) ENGINE=InnoDB;

INSERT INTO user_company_tab_permissions (user_company_id,module_slug,tab_key,can_view)
SELECT owner.id,'crm',scope.tab_key,0 FROM user_companies owner
CROSS JOIN (SELECT 'conversations' AS tab_key UNION ALL SELECT 'conversations_manage') scope
WHERE NOT EXISTS (SELECT 1 FROM user_company_tab_permissions current_permission WHERE current_permission.user_company_id=owner.id AND current_permission.module_slug='crm' AND current_permission.tab_key=scope.tab_key);

INSERT INTO user_invitation_tab_permissions (invitation_id,module_slug,tab_key,can_view)
SELECT owner.id,'crm',scope.tab_key,0 FROM user_invitations owner
CROSS JOIN (SELECT 'conversations' AS tab_key UNION ALL SELECT 'conversations_manage') scope
WHERE NOT EXISTS (SELECT 1 FROM user_invitation_tab_permissions current_permission WHERE current_permission.invitation_id=owner.id AND current_permission.module_slug='crm' AND current_permission.tab_key=scope.tab_key);

-- System-owned sanitized rejection ledger: no tenant can be inferred for unknown provider routes.
CREATE TABLE sales_wa_ingress_rejections (
 event_key CHAR(64) NOT NULL PRIMARY KEY, reason_code VARCHAR(40) NOT NULL,
 received_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB;
