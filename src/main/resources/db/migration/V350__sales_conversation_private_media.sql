ALTER TABLE sales_conversation_messages ADD UNIQUE KEY uq_wa_message_conversation(company_id,conversation_id,id);
CREATE TABLE sales_conversation_attachments (
 company_id BIGINT NOT NULL,id CHAR(36) NOT NULL,conversation_id CHAR(36) NOT NULL,message_id CHAR(36) NULL,
 uploader_membership_id BIGINT NULL,request_key CHAR(36) NOT NULL,direction VARCHAR(8) NOT NULL,
 file_name VARCHAR(180) NOT NULL,mime_type VARCHAR(100) NOT NULL,size_bytes BIGINT NOT NULL DEFAULT 0,
 state VARCHAR(20) NOT NULL,object_key VARCHAR(600) NULL,upload_key VARCHAR(600) NULL,sha256 CHAR(64) NULL,
 provider_media_id VARCHAR(100) NULL,expected_provider_hash VARCHAR(128) NULL,
 expires_at DATETIME(6) NULL,cleanup_at DATETIME(6) NULL,error_code VARCHAR(80) NULL,
 attempts INT NOT NULL DEFAULT 0,fence BIGINT NOT NULL DEFAULT 0,lease_until DATETIME(6) NULL,
 next_attempt_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 PRIMARY KEY(company_id,id),UNIQUE KEY uq_wa_attachment_message(company_id,message_id),
 UNIQUE KEY uq_wa_attachment_intent(company_id,uploader_membership_id,request_key),
 KEY ix_wa_attachment_rate(company_id,uploader_membership_id,created_at),KEY ix_wa_media_work(state,next_attempt_at,lease_until),
 FOREIGN KEY(company_id,conversation_id) REFERENCES sales_conversations(company_id,id),
 FOREIGN KEY(company_id,conversation_id,message_id) REFERENCES sales_conversation_messages(company_id,conversation_id,id),
 CONSTRAINT ck_wa_attachment_state CHECK(state IN ('STAGING','READY','PENDING','CLAIMED','REJECTED','EXPIRED'))
) ENGINE=InnoDB;
ALTER TABLE sales_conversation_events ADD UNIQUE KEY uq_wa_event_tenant(company_id,seq);
CREATE TABLE sales_conversation_notification_outbox (
 company_id BIGINT NOT NULL,event_seq BIGINT NOT NULL,recipient_membership_id BIGINT NOT NULL,
 delivered_at DATETIME(6) NULL,cancelled_at DATETIME(6) NULL,attempts INT NOT NULL DEFAULT 0,
 next_attempt_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),error_code VARCHAR(80) NULL,
 PRIMARY KEY(company_id,event_seq,recipient_membership_id),KEY ix_wa_notice_work(delivered_at,cancelled_at,next_attempt_at),
 FOREIGN KEY(company_id,event_seq) REFERENCES sales_conversation_events(company_id,seq)
) ENGINE=InnoDB;
ALTER TABLE sales_conversations ADD COLUMN outbound_blocked BOOLEAN NOT NULL DEFAULT FALSE;
