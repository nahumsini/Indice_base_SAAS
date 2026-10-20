-- User-owned drafts and immutable named snapshots. Existing boards and photos are unchanged.
CREATE TABLE personal_system_boards (
 company_id BIGINT NOT NULL,user_id BIGINT NOT NULL,content_json JSON NOT NULL,
 version BIGINT NOT NULL DEFAULT 0,last_mutation_id CHAR(36) NULL,content_digest CHAR(64) NOT NULL,
 updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 PRIMARY KEY(company_id,user_id),
 CONSTRAINT fk_system_board_company FOREIGN KEY(company_id) REFERENCES companies(id),
 CONSTRAINT fk_system_board_user FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE personal_idea_projects (
 company_id BIGINT NOT NULL,user_id BIGINT NOT NULL,project_id CHAR(36) NOT NULL,
 name VARCHAR(120) NOT NULL,kind VARCHAR(20) NOT NULL,content_json JSON NOT NULL,content_digest CHAR(64) NOT NULL,
 node_count INT NOT NULL,connection_count INT NOT NULL,created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 PRIMARY KEY(company_id,user_id,project_id),
 INDEX ix_idea_projects_owner_date(company_id,user_id,created_at),
 CONSTRAINT fk_idea_project_company FOREIGN KEY(company_id) REFERENCES companies(id),
 CONSTRAINT fk_idea_project_user FOREIGN KEY(user_id) REFERENCES users(id),
 CONSTRAINT chk_idea_project_kind CHECK(kind IN ('FREEFORM','SYSTEM'))
);
CREATE TABLE personal_idea_workspace_audit (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,company_id BIGINT NOT NULL,user_id BIGINT NOT NULL,
 event_type VARCHAR(24) NOT NULL,project_id CHAR(36) NULL,node_count INT NOT NULL,connection_count INT NOT NULL,
 occurred_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 CONSTRAINT fk_idea_workspace_audit_company FOREIGN KEY(company_id) REFERENCES companies(id),
 CONSTRAINT fk_idea_workspace_audit_user FOREIGN KEY(user_id) REFERENCES users(id)
);
