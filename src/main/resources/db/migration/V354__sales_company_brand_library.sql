CREATE TABLE sales_brand_profiles (
 company_id BIGINT NOT NULL PRIMARY KEY,
 details_json JSON NOT NULL,
 version BIGINT NOT NULL DEFAULT 1,
 last_mutation_id CHAR(36) NOT NULL,
 last_digest CHAR(64) NOT NULL,
 updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 CONSTRAINT fk_brand_profile_company FOREIGN KEY(company_id) REFERENCES companies(id)
);
CREATE TABLE sales_brand_assets (
 company_id BIGINT NOT NULL,
 id CHAR(36) NOT NULL,
 created_by BIGINT NOT NULL,
 filename VARCHAR(180) NOT NULL,
 content_type VARCHAR(100) NOT NULL,
 size_bytes BIGINT NOT NULL,
 category VARCHAR(24) NOT NULL,
 object_key VARCHAR(500) NOT NULL,
 status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
 created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 PRIMARY KEY(company_id,id),
 CONSTRAINT fk_brand_asset_company FOREIGN KEY(company_id) REFERENCES companies(id),
 CONSTRAINT ck_brand_asset_category CHECK(category IN ('PHOTO','DOCUMENT','REFERENCE','LOGO_VARIANT')),
 CONSTRAINT ck_brand_asset_status CHECK(status IN ('PENDING','READY','ARCHIVED'))
);
CREATE TABLE sales_funnel_brand_contexts (
 company_id BIGINT NOT NULL,
 funnel_id CHAR(36) NOT NULL,
 snapshot_json JSON NOT NULL,
 version BIGINT NOT NULL,
 last_mutation_id CHAR(36) NOT NULL,
 last_digest CHAR(64) NOT NULL,
 updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 PRIMARY KEY(company_id,funnel_id),
 CONSTRAINT fk_funnel_brand_parent FOREIGN KEY(company_id,funnel_id) REFERENCES sales_funnels(company_id,id)
);
CREATE TABLE sales_brand_audit (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 company_id BIGINT NOT NULL,
 actor_id BIGINT NOT NULL,
 event_type VARCHAR(24) NOT NULL,
 reference_id CHAR(36),
 version BIGINT NOT NULL,
 created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 INDEX ix_brand_audit_company(company_id,id),
 CONSTRAINT fk_brand_audit_company FOREIGN KEY(company_id) REFERENCES companies(id)
);
