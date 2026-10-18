-- Company-owned script heads; immutable revisions and contact records remain in Sales.
CREATE TABLE sales_call_scripts (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 company_id BIGINT UNSIGNED NOT NULL,
 flow_id BIGINT UNSIGNED NOT NULL,
 version INT NOT NULL,
 published_version INT NULL,
 archived BOOLEAN NOT NULL DEFAULT FALSE,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 INDEX idx_call_scripts_flow (company_id, flow_id, archived)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sales_call_script_versions (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 company_id BIGINT UNSIGNED NOT NULL,
 script_id BIGINT UNSIGNED NOT NULL,
 version INT NOT NULL,
 content_json JSON NOT NULL,
 publication_status VARCHAR(16) NOT NULL,
 actor_user_id BIGINT UNSIGNED NOT NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 UNIQUE KEY uq_call_script_version (company_id, script_id, version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sales_call_interactions (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 company_id BIGINT UNSIGNED NOT NULL,
 flow_id BIGINT UNSIGNED NOT NULL,
 opportunity_id BIGINT UNSIGNED NOT NULL,
 actor_user_id BIGINT UNSIGNED NOT NULL,
 actor_name VARCHAR(255) NOT NULL,
 request_key CHAR(36) NOT NULL,
 request_hash CHAR(64) NOT NULL,
 outcome VARCHAR(32) NOT NULL,
 notes TEXT NOT NULL,
 script_id BIGINT UNSIGNED NULL,
 script_version INT NULL,
 script_name VARCHAR(160) NULL,
 followup_mode VARCHAR(16) NOT NULL,
 next_action VARCHAR(40) NULL,
 next_action_at VARCHAR(32) NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 UNIQUE KEY uq_call_interaction_retry (company_id, actor_user_id, request_key),
 INDEX idx_call_interaction_history (company_id, opportunity_id, id),
 INDEX idx_call_interaction_day (company_id, flow_id, actor_user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
