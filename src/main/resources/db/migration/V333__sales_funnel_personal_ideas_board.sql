CREATE TABLE sales_funnel_idea_boards (
 company_id BIGINT NOT NULL, user_id BIGINT NOT NULL, content_json JSON NOT NULL,
 version BIGINT NOT NULL DEFAULT 0, last_mutation_id CHAR(36) NULL, content_digest CHAR(64) NOT NULL,
 updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 PRIMARY KEY(company_id,user_id),
 CONSTRAINT fk_funnel_board_company FOREIGN KEY(company_id) REFERENCES companies(id),
 CONSTRAINT fk_funnel_board_user FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE sales_funnel_idea_board_audit (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, company_id BIGINT NOT NULL, user_id BIGINT NOT NULL,
 version BIGINT NOT NULL,node_count INT NOT NULL,connection_count INT NOT NULL,
 occurred_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 CONSTRAINT fk_funnel_board_audit_owner FOREIGN KEY(company_id,user_id) REFERENCES sales_funnel_idea_boards(company_id,user_id)
);
CREATE TABLE sales_funnel_idea_assets (
 company_id BIGINT NOT NULL,user_id BIGINT NOT NULL,id CHAR(36) NOT NULL,
 file_name VARCHAR(180) NOT NULL,content_type VARCHAR(80) NOT NULL,size_bytes BIGINT NOT NULL,
 object_key VARCHAR(300) NOT NULL,content_digest CHAR(64) NOT NULL,
 created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 PRIMARY KEY(company_id,user_id,id),
 CONSTRAINT fk_funnel_board_asset_owner FOREIGN KEY(company_id,user_id) REFERENCES sales_funnel_idea_boards(company_id,user_id),
 CONSTRAINT chk_funnel_board_asset_size CHECK(size_bytes>0 AND size_bytes<=5242880)
);
