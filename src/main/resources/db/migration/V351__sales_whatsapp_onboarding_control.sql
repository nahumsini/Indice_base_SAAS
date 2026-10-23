-- Local preparation only; sessions contain hashes and sanitized outcomes, never OAuth codes/tokens.
ALTER TABLE sales_wa_connections ADD COLUMN portfolio_id VARCHAR(80) NULL;
CREATE TABLE sales_wa_onboarding_sessions (
 company_id BIGINT NOT NULL,id CHAR(36) NOT NULL,connection_id CHAR(36) NOT NULL,
 actor_membership_id BIGINT NOT NULL,session_hash CHAR(64) NOT NULL,state_hash CHAR(64) NOT NULL,
 connection_version BIGINT NOT NULL,state VARCHAR(24) NOT NULL DEFAULT 'PENDING',
 expires_at DATETIME(6) NOT NULL,created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 completed_at DATETIME(6) NULL,error_code VARCHAR(80) NULL,
 PRIMARY KEY(company_id,id),UNIQUE KEY uq_wa_oauth_state(state_hash),
 KEY ix_wa_onboarding_expiry(state,expires_at),
 FOREIGN KEY(company_id,connection_id) REFERENCES sales_wa_connections(company_id,id),
 CONSTRAINT ck_wa_onboarding_state CHECK(state IN ('PENDING','VERIFYING','CONNECTED','FAILED','EXPIRED'))
) ENGINE=InnoDB;
ALTER TABLE sales_conversation_events
 ADD COLUMN previous_membership_id BIGINT NULL,
 ADD COLUMN previous_status VARCHAR(32) NULL,
 ADD COLUMN resulting_status VARCHAR(32) NULL,
 ADD COLUMN correlation_id VARCHAR(80) NULL;

ALTER TABLE sales_conversation_commands
 MODIFY COLUMN conversation_id CHAR(36) NULL,
 ADD COLUMN connection_id CHAR(36) NULL,
 ADD CONSTRAINT fk_wa_control_connection FOREIGN KEY(company_id,connection_id) REFERENCES sales_wa_connections(company_id,id),
 ADD CONSTRAINT ck_wa_command_owner CHECK((conversation_id IS NULL) <> (connection_id IS NULL));
