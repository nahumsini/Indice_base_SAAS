CREATE TABLE sales_whatsapp_campaigns (
 company_id BIGINT NOT NULL, id CHAR(36) NOT NULL, name VARCHAR(180) NOT NULL,
 objective VARCHAR(40) NOT NULL, offer VARCHAR(240) NOT NULL DEFAULT '',
 default_region CHAR(2) NOT NULL, resource_url VARCHAR(1600) NOT NULL DEFAULT '',
 steps_json JSON NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
 owner_user_id BIGINT NOT NULL, version BIGINT NOT NULL DEFAULT 1,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 PRIMARY KEY(company_id,id), KEY idx_wa_campaign_list(company_id,status,updated_at),
 CONSTRAINT fk_wa_campaign_company FOREIGN KEY(company_id) REFERENCES companies(id),
 CONSTRAINT fk_wa_campaign_owner FOREIGN KEY(owner_user_id) REFERENCES users(id),
 CONSTRAINT chk_wa_campaign_status CHECK(status IN ('DRAFT','ACTIVE','PAUSED','COMPLETED','ARCHIVED'))
);
CREATE TABLE sales_whatsapp_recipients (
 id BIGINT NOT NULL AUTO_INCREMENT,
 company_id BIGINT NOT NULL, campaign_id CHAR(36) NOT NULL, contact_id BIGINT NOT NULL,
 step_index INT NOT NULL DEFAULT 0, state VARCHAR(20) NOT NULL DEFAULT 'PENDING',
 next_action_at DATETIME(6) NULL, notes VARCHAR(2000) NOT NULL DEFAULT '',
 prepared_phone VARCHAR(20) NULL, prepared_text TEXT NULL, prepared_by BIGINT NULL,
 version BIGINT NOT NULL DEFAULT 1, updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 PRIMARY KEY(company_id,campaign_id,contact_id), UNIQUE KEY uq_wa_recipient_id(id), KEY idx_wa_recipient_due(company_id,state,next_action_at),
 CONSTRAINT fk_wa_recipient_campaign FOREIGN KEY(company_id,campaign_id) REFERENCES sales_whatsapp_campaigns(company_id,id),
 CONSTRAINT fk_wa_recipient_contact FOREIGN KEY(contact_id) REFERENCES sales_contacts(id),
 CONSTRAINT chk_wa_recipient_state CHECK(state IN ('PENDING','PREPARED','WAITING','DONE','SKIPPED','REPLIED','BLOCKED'))
);
CREATE TABLE sales_whatsapp_suppressions (
 company_id BIGINT NOT NULL, phone VARCHAR(20) NOT NULL, actor_user_id BIGINT NOT NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 PRIMARY KEY(company_id,phone), CONSTRAINT fk_wa_suppression_company FOREIGN KEY(company_id) REFERENCES companies(id)
);
CREATE TABLE sales_whatsapp_events (
 id BIGINT NOT NULL AUTO_INCREMENT, company_id BIGINT NOT NULL, campaign_id CHAR(36) NOT NULL,
 contact_id BIGINT NULL, actor_user_id BIGINT NOT NULL, action VARCHAR(30) NOT NULL,
 step_index INT NULL, occurred_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 PRIMARY KEY(id), KEY idx_wa_events(company_id,campaign_id,contact_id,id),
 CONSTRAINT fk_wa_event_campaign FOREIGN KEY(company_id,campaign_id) REFERENCES sales_whatsapp_campaigns(company_id,id)
);
CREATE TABLE sales_whatsapp_templates (
 company_id BIGINT NOT NULL, id CHAR(36) NOT NULL, name VARCHAR(180) NOT NULL,
 body_text TEXT NOT NULL, status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE', version BIGINT NOT NULL DEFAULT 1,
 updated_by BIGINT NOT NULL, updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 PRIMARY KEY(company_id,id), CONSTRAINT fk_wa_template_company FOREIGN KEY(company_id) REFERENCES companies(id),
 CONSTRAINT chk_wa_template_status CHECK(status IN ('ACTIVE','ARCHIVED'))
);
CREATE TABLE sales_whatsapp_lists (
 company_id BIGINT NOT NULL, id CHAR(36) NOT NULL, name VARCHAR(180) NOT NULL,
 contact_ids_json JSON NOT NULL, version BIGINT NOT NULL DEFAULT 1,
 updated_by BIGINT NOT NULL, updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 PRIMARY KEY(company_id,id), CONSTRAINT fk_wa_list_company FOREIGN KEY(company_id) REFERENCES companies(id)
);
