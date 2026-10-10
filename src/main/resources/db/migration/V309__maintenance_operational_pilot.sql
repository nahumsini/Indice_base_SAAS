-- Preserve existing module assignments; no tenant entitlements or external prices are created.
UPDATE modules SET lifecycle_status='pilot', access_model='tabs', badge_text='Pilot',
 description='Technical requests, work orders, assets and preventive maintenance.' WHERE slug='maintenance';
INSERT INTO user_company_tab_permissions(user_company_id,module_slug,tab_key,can_view)
SELECT DISTINCT uc.id,'maintenance',t.tab_key,1 FROM user_companies uc
JOIN user_company_module_roles mr ON mr.user_company_id=uc.id AND mr.module_slug='maintenance'
CROSS JOIN (SELECT 'requests' tab_key UNION ALL SELECT 'orders' UNION ALL SELECT 'assets'
 UNION ALL SELECT 'preventive' UNION ALL SELECT 'indicators' UNION ALL SELECT 'configuration') t
LEFT JOIN user_company_tab_permissions p ON p.user_company_id=uc.id AND p.module_slug='maintenance' AND p.tab_key=t.tab_key
WHERE uc.status='active' AND p.id IS NULL
 AND (t.tab_key IN ('requests','orders','assets') OR LOWER(uc.role) IN ('root','superadmin','admin','owner','dueno','manager','approver'))
 AND (t.tab_key<>'configuration' OR LOWER(uc.role) IN ('root','superadmin','admin','owner','dueno'));

CREATE TABLE maintenance_assets (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, company_id BIGINT NOT NULL,
 name VARCHAR(180) NOT NULL, asset_type VARCHAR(24) NOT NULL, hr_asset_id BIGINT NULL,
 unit_id BIGINT NULL, business_id BIGINT NULL, location VARCHAR(240) NOT NULL DEFAULT '',
 criticality VARCHAR(16) NOT NULL, notes TEXT NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE,
 version BIGINT NOT NULL DEFAULT 1, created_by BIGINT NOT NULL,
 created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 UNIQUE KEY uq_maintenance_asset_tenant(company_id,id), UNIQUE KEY uq_maintenance_hr_asset(company_id,hr_asset_id),
 KEY idx_maintenance_asset_scope(company_id,unit_id,business_id,active),
 CONSTRAINT fk_maintenance_asset_company FOREIGN KEY(company_id) REFERENCES companies(id)
);
CREATE TABLE maintenance_settings (
 company_id BIGINT NOT NULL PRIMARY KEY, timezone VARCHAR(80) NOT NULL DEFAULT 'UTC',
 currency CHAR(3) NOT NULL DEFAULT 'MXN', hourly_rate DECIMAL(19,4) NOT NULL DEFAULT 0,
 critical_hours INT NOT NULL DEFAULT 2, high_hours INT NOT NULL DEFAULT 8,
 normal_hours INT NOT NULL DEFAULT 24, low_hours INT NOT NULL DEFAULT 72,
 categories JSON NOT NULL, specialties JSON NOT NULL, procedures JSON NOT NULL,
 evidence_required BOOLEAN NOT NULL DEFAULT TRUE, version BIGINT NOT NULL DEFAULT 1,
 CONSTRAINT fk_maintenance_settings_company FOREIGN KEY(company_id) REFERENCES companies(id)
);
CREATE TABLE maintenance_requests (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, company_id BIGINT NOT NULL, asset_id BIGINT NULL,
 unit_id BIGINT NULL,business_id BIGINT NULL, requester_id BIGINT NOT NULL,
 title VARCHAR(180) NOT NULL, description TEXT NOT NULL, location VARCHAR(240) NOT NULL,
 priority VARCHAR(16) NOT NULL, category VARCHAR(80) NOT NULL DEFAULT '',
 status VARCHAR(24) NOT NULL DEFAULT 'NEW', response_at DATETIME(6) NULL,
 version BIGINT NOT NULL DEFAULT 1, created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 UNIQUE KEY uq_maintenance_request_tenant(company_id,id),
 KEY idx_maintenance_request_scope(company_id,status,unit_id,business_id,requester_id),
 CONSTRAINT fk_maintenance_request_company FOREIGN KEY(company_id) REFERENCES companies(id),
 CONSTRAINT fk_maintenance_request_asset FOREIGN KEY(company_id,asset_id) REFERENCES maintenance_assets(company_id,id)
);
CREATE TABLE maintenance_plans (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,company_id BIGINT NOT NULL,asset_id BIGINT NOT NULL,
 title VARCHAR(180) NOT NULL,description TEXT NOT NULL,priority VARCHAR(16) NOT NULL,
 anchor_date DATE NOT NULL,frequency VARCHAR(16) NOT NULL,interval_count INT NOT NULL,
 timezone VARCHAR(80) NOT NULL,lead_days INT NOT NULL,next_cycle INT NOT NULL DEFAULT 0,next_date DATE NOT NULL,
 checklist JSON NOT NULL,evidence_required BOOLEAN NOT NULL,active BOOLEAN NOT NULL DEFAULT TRUE,
 currency CHAR(3) NOT NULL,estimated_amount DECIMAL(19,4) NOT NULL DEFAULT 0,
 version BIGINT NOT NULL DEFAULT 1,created_by BIGINT NOT NULL,
 UNIQUE KEY uq_maintenance_plan_tenant(company_id,id), KEY idx_maintenance_plan_next(active,next_date,id),
 CONSTRAINT fk_maintenance_plan_asset FOREIGN KEY(company_id,asset_id) REFERENCES maintenance_assets(company_id,id)
);
CREATE TABLE maintenance_orders (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,company_id BIGINT NOT NULL,asset_id BIGINT NULL,
 request_id BIGINT NULL,plan_id BIGINT NULL,plan_cycle INT NULL,unit_id BIGINT NULL,business_id BIGINT NULL,
 title VARCHAR(180) NOT NULL,description TEXT NOT NULL,order_type VARCHAR(24) NOT NULL,
 priority VARCHAR(16) NOT NULL,category VARCHAR(80) NOT NULL DEFAULT '',status VARCHAR(24) NOT NULL DEFAULT 'OPEN',
 assignee_id BIGINT NULL,due_at DATETIME(6) NOT NULL,original_due_at DATETIME(6) NOT NULL,
 scheduled_start DATETIME(6) NULL,scheduled_end DATETIME(6) NULL,timezone VARCHAR(80) NOT NULL,
 diagnosis TEXT NOT NULL,resolution TEXT NOT NULL,checklist JSON NOT NULL,evidence_required BOOLEAN NOT NULL,
 blocking BOOLEAN NOT NULL DEFAULT FALSE,currency CHAR(3) NOT NULL,estimated_amount DECIMAL(19,4) NOT NULL,
 started_at DATETIME(6) NULL,closed_at DATETIME(6) NULL,version BIGINT NOT NULL DEFAULT 1,
 created_by BIGINT NOT NULL,created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 UNIQUE KEY uq_maintenance_order_tenant(company_id,id),UNIQUE KEY uq_maintenance_request_order(company_id,request_id),
 UNIQUE KEY uq_maintenance_plan_cycle(company_id,plan_id,plan_cycle),
 KEY idx_maintenance_order_scope(company_id,status,unit_id,business_id,assignee_id),
 KEY idx_maintenance_order_deadline(company_id,due_at),KEY idx_maintenance_order_resource(assignee_id,scheduled_start,scheduled_end),
 CONSTRAINT fk_maintenance_order_company FOREIGN KEY(company_id) REFERENCES companies(id),
 CONSTRAINT fk_maintenance_order_asset FOREIGN KEY(company_id,asset_id) REFERENCES maintenance_assets(company_id,id),
 CONSTRAINT fk_maintenance_order_request FOREIGN KEY(company_id,request_id) REFERENCES maintenance_requests(company_id,id),
 CONSTRAINT fk_maintenance_order_plan FOREIGN KEY(company_id,plan_id) REFERENCES maintenance_plans(company_id,id)
);
CREATE TABLE maintenance_events (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,company_id BIGINT NOT NULL,entity_type VARCHAR(24) NOT NULL,
 entity_id BIGINT NOT NULL,action VARCHAR(48) NOT NULL,actor_id BIGINT NULL,reason TEXT NOT NULL,
 created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 KEY idx_maintenance_event_entity(company_id,entity_type,entity_id,id),
 CONSTRAINT fk_maintenance_event_company FOREIGN KEY(company_id) REFERENCES companies(id)
);
CREATE TABLE maintenance_replays (
 company_id BIGINT NOT NULL,actor_id BIGINT NOT NULL,operation VARCHAR(32) NOT NULL,
 request_key VARCHAR(80) NOT NULL,fingerprint CHAR(64) NOT NULL,entity_id BIGINT NOT NULL,
 PRIMARY KEY(company_id,actor_id,operation,request_key),
 CONSTRAINT fk_maintenance_replay_company FOREIGN KEY(company_id) REFERENCES companies(id)
);
CREATE TABLE maintenance_outages (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,company_id BIGINT NOT NULL,asset_id BIGINT NOT NULL,
 started_at DATETIME(6) NOT NULL,ended_at DATETIME(6) NULL,restored_by BIGINT NULL,reason VARCHAR(2000) NOT NULL DEFAULT '',
 open_asset_id BIGINT GENERATED ALWAYS AS (CASE WHEN ended_at IS NULL THEN asset_id ELSE NULL END) STORED,
 UNIQUE KEY uq_maintenance_open_outage(company_id,open_asset_id),
 KEY idx_maintenance_outage_period(company_id,started_at,ended_at),
 CONSTRAINT fk_maintenance_outage_asset FOREIGN KEY(company_id,asset_id) REFERENCES maintenance_assets(company_id,id)
);
CREATE TABLE maintenance_uploads (
 id CHAR(36) NOT NULL PRIMARY KEY,company_id BIGINT NOT NULL,actor_id BIGINT NOT NULL,
 entity_type VARCHAR(24) NOT NULL,entity_id BIGINT NOT NULL,filename VARCHAR(180) NOT NULL,
 content_type VARCHAR(80) NOT NULL,size_bytes BIGINT NOT NULL,object_key VARCHAR(500) NOT NULL,
 expires_at DATETIME(6) NOT NULL,registered BOOLEAN NOT NULL DEFAULT FALSE,
 KEY idx_maintenance_upload_tenant(company_id,id),
 CONSTRAINT fk_maintenance_upload_company FOREIGN KEY(company_id) REFERENCES companies(id)
);
CREATE TABLE maintenance_attachments (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,company_id BIGINT NOT NULL,entity_type VARCHAR(24) NOT NULL,
 entity_id BIGINT NOT NULL,upload_id CHAR(36) NOT NULL,filename VARCHAR(180) NOT NULL,
 content_type VARCHAR(80) NOT NULL,size_bytes BIGINT NOT NULL,object_key VARCHAR(500) NOT NULL,
 created_by BIGINT NOT NULL,created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 UNIQUE KEY uq_maintenance_attachment_upload(company_id,upload_id),
 KEY idx_maintenance_attachment_entity(company_id,entity_type,entity_id),
 CONSTRAINT fk_maintenance_attachment_company FOREIGN KEY(company_id) REFERENCES companies(id)
);
CREATE TABLE maintenance_labor (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,company_id BIGINT NOT NULL,order_id BIGINT NOT NULL,
 technician_id BIGINT NOT NULL,minutes INT NOT NULL,hourly_rate DECIMAL(19,4) NOT NULL,
 amount DECIMAL(19,4) NOT NULL,currency CHAR(3) NOT NULL,note VARCHAR(2000) NOT NULL,
 reversed_at DATETIME(6) NULL,created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 CONSTRAINT fk_maintenance_labor_order FOREIGN KEY(company_id,order_id) REFERENCES maintenance_orders(company_id,id)
);
CREATE TABLE maintenance_parts (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,company_id BIGINT NOT NULL,order_id BIGINT NOT NULL,
 movement_id BIGINT NOT NULL,product_name VARCHAR(240) NOT NULL,warehouse_name VARCHAR(240) NOT NULL,
 quantity DECIMAL(19,4) NOT NULL,unit_cost DECIMAL(19,4) NOT NULL,currency CHAR(3) NOT NULL,
 reversal_id BIGINT NULL,created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 UNIQUE KEY uq_maintenance_part_movement(company_id,movement_id),
 CONSTRAINT fk_maintenance_part_order FOREIGN KEY(company_id,order_id) REFERENCES maintenance_orders(company_id,id)
);
CREATE TABLE maintenance_expense_links (
 company_id BIGINT NOT NULL,order_id BIGINT NOT NULL,expense_id BIGINT NOT NULL,
 cost_type VARCHAR(24) NOT NULL,created_by BIGINT NOT NULL,created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 PRIMARY KEY(company_id,expense_id),
 CONSTRAINT fk_maintenance_expense_order FOREIGN KEY(company_id,order_id) REFERENCES maintenance_orders(company_id,id)
);
CREATE TABLE maintenance_task_links (
 company_id BIGINT NOT NULL,order_id BIGINT NOT NULL,task_id BIGINT NOT NULL,
 PRIMARY KEY(company_id,order_id),UNIQUE KEY uq_maintenance_task(company_id,task_id),
 CONSTRAINT fk_maintenance_task_order FOREIGN KEY(company_id,order_id) REFERENCES maintenance_orders(company_id,id)
);
