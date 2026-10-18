-- Additive Sales-owned operational continuity; does not change financial sale records.
CREATE TABLE sales_post_sale_flows (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 company_id BIGINT NOT NULL,
 name VARCHAR(160) NOT NULL,
 stages_json JSON NOT NULL,
 version INT NOT NULL DEFAULT 1,
 archived BOOLEAN NOT NULL DEFAULT FALSE,
 creation_key CHAR(36) NOT NULL,
 creation_hash CHAR(64) NOT NULL,
 created_by_user_id BIGINT NOT NULL,
 updated_by_user_id BIGINT NOT NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 UNIQUE KEY uq_post_sale_flow_creation (company_id, creation_key),
 INDEX idx_post_sale_flow_company (company_id, archived)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE sales_post_sale_work (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 company_id BIGINT NOT NULL,
 source_kind VARCHAR(12) NOT NULL,
 source_id BIGINT NOT NULL,
 flow_id BIGINT NULL,
 stage_key VARCHAR(50) NOT NULL DEFAULT 'pending',
 owner_user_company_id BIGINT NULL,
 next_action VARCHAR(240) NOT NULL DEFAULT '',
 next_action_date DATE NULL,
 notes TEXT NOT NULL,
 loss_reason VARCHAR(500) NOT NULL DEFAULT '',
 recovery_status VARCHAR(20) NOT NULL DEFAULT 'unscheduled',
 recovered_opportunity_id BIGINT NULL,
 version INT NOT NULL DEFAULT 1,
 last_request_key CHAR(36) NOT NULL,
 last_request_hash CHAR(64) NOT NULL,
 created_by_user_id BIGINT NOT NULL,
 updated_by_user_id BIGINT NOT NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 UNIQUE KEY uq_post_sale_source (company_id, source_kind, source_id),
 INDEX idx_post_sale_work_flow (company_id, flow_id, stage_key),
 INDEX idx_post_sale_work_due (next_action_date, id),
 INDEX idx_post_sale_work_owner (company_id, owner_user_company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE sales_post_sale_work_events (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 company_id BIGINT NOT NULL,
 work_id BIGINT NOT NULL,
 actor_user_id BIGINT NOT NULL,
 actor_name VARCHAR(255) NOT NULL,
 event_type VARCHAR(32) NOT NULL,
 detail_json JSON NOT NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 INDEX idx_post_sale_work_history (company_id, work_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
