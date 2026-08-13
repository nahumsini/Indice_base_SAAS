CREATE TABLE consulting_consultants (
  id BIGINT NOT NULL AUTO_INCREMENT,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  email VARCHAR(190) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_by_user_id BIGINT NOT NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_consulting_consultants_email (email),
  KEY idx_consulting_consultants_active_name (active, last_name, first_name),
  CONSTRAINT fk_consulting_consultants_created_by
    FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE platform_module_work_orders (
  id BIGINT NOT NULL AUTO_INCREMENT,
  module_name VARCHAR(120) NOT NULL,
  technical_name VARCHAR(120) NOT NULL,
  module_slug VARCHAR(120) NOT NULL,
  route_segment VARCHAR(160) NOT NULL,
  source_locale VARCHAR(10) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  created_by_user_id BIGINT NOT NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_platform_module_work_orders_slug (module_slug),
  KEY idx_platform_module_work_orders_status (status, created_at),
  CONSTRAINT chk_platform_module_work_orders_status
    CHECK (status IN ('DRAFT', 'IN_REVIEW', 'APPROVED', 'IMPLEMENTED', 'CANCELLED')),
  CONSTRAINT fk_platform_module_work_orders_created_by
    FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
