-- Named snapshots stay immutable. Management and explicit read/copy grants are tenant scoped.
ALTER TABLE personal_idea_projects
 ADD COLUMN management_version BIGINT NOT NULL DEFAULT 0,
 ADD COLUMN deleted_at TIMESTAMP(6) NULL,
 ADD COLUMN last_management_mutation CHAR(36) NULL,
 ADD COLUMN last_management_digest CHAR(64) NULL,
 ADD COLUMN copy_source_owner BIGINT NULL,
 ADD COLUMN copy_source_id CHAR(36) NULL,
 ADD COLUMN copy_request_digest CHAR(64) NULL,
 ADD INDEX ix_idea_projects_owner_deleted(company_id,user_id,deleted_at,created_at);
CREATE TABLE personal_idea_project_shares (
 company_id BIGINT NOT NULL,owner_user_id BIGINT NOT NULL,project_id CHAR(36) NOT NULL,
 recipient_user_id BIGINT NOT NULL,created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 revoked_at TIMESTAMP(6) NULL,
 PRIMARY KEY(company_id,owner_user_id,project_id,recipient_user_id),
 INDEX ix_idea_project_recipient(company_id,recipient_user_id,revoked_at),
 CONSTRAINT fk_idea_share_project FOREIGN KEY(company_id,owner_user_id,project_id)
  REFERENCES personal_idea_projects(company_id,user_id,project_id),
 CONSTRAINT fk_idea_share_recipient FOREIGN KEY(recipient_user_id) REFERENCES users(id),
 CONSTRAINT chk_idea_share_not_owner CHECK(owner_user_id<>recipient_user_id)
);
