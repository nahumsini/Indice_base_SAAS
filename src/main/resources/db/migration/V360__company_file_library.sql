CREATE TABLE file_library_entries (
 company_id BIGINT NOT NULL, id CHAR(36) NOT NULL, owner_user_id BIGINT NOT NULL,
 parent_id CHAR(36) NULL, kind VARCHAR(10) NOT NULL, name VARCHAR(180) NOT NULL,
 content_type VARCHAR(120) NOT NULL DEFAULT 'application/octet-stream', size_bytes BIGINT NOT NULL DEFAULT 0,
 object_key VARCHAR(500) NULL, status VARCHAR(12) NOT NULL DEFAULT 'READY',
 trashed_at TIMESTAMP(6) NULL, version BIGINT NOT NULL DEFAULT 1,
 creation_digest CHAR(64) NOT NULL, last_mutation_id CHAR(36) NULL, last_digest CHAR(64) NULL,
 created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 PRIMARY KEY(company_id,id), KEY idx_file_library_parent(company_id,parent_id,status),
 KEY idx_file_library_owner(company_id,owner_user_id,trashed_at),
 CONSTRAINT fk_file_library_company FOREIGN KEY(company_id) REFERENCES companies(id),
 CONSTRAINT fk_file_library_owner FOREIGN KEY(owner_user_id) REFERENCES users(id),
 CONSTRAINT fk_file_library_parent FOREIGN KEY(company_id,parent_id) REFERENCES file_library_entries(company_id,id),
 CONSTRAINT chk_file_library_kind CHECK(kind IN ('FOLDER','FILE')),
 CONSTRAINT chk_file_library_status CHECK(status IN ('PENDING','READY'))
);
CREATE TABLE file_library_grants (
 company_id BIGINT NOT NULL, entry_id CHAR(36) NOT NULL, user_id BIGINT NOT NULL,
 permission_level INT NOT NULL, PRIMARY KEY(company_id,entry_id,user_id),
 CONSTRAINT fk_file_library_grant_entry FOREIGN KEY(company_id,entry_id) REFERENCES file_library_entries(company_id,id),
 CONSTRAINT fk_file_library_grant_user FOREIGN KEY(user_id) REFERENCES users(id),
 CONSTRAINT chk_file_library_grant CHECK(permission_level BETWEEN 1 AND 3)
);
CREATE TABLE file_library_audit (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, company_id BIGINT NOT NULL, actor_id BIGINT NOT NULL,
 entry_id CHAR(36) NOT NULL, action VARCHAR(30) NOT NULL, version BIGINT NOT NULL,
 occurred_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), KEY idx_file_library_audit(company_id,entry_id,id)
);
