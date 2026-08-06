CREATE TABLE IF NOT EXISTS sales_commission_cut_schedules (
  id BIGINT NOT NULL AUTO_INCREMENT,
  company_id BIGINT NOT NULL,
  cadence VARCHAR(20) NOT NULL,
  timezone VARCHAR(60) NOT NULL DEFAULT 'America/Monterrey',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  next_run_date DATE NOT NULL,
  last_run_at DATETIME NULL,
  created_by_user_id BIGINT NULL,
  created_by_user_company_id BIGINT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_sales_commission_cut_schedule_company (company_id),
  KEY idx_sales_commission_cut_schedule_due (status, next_run_date),
  CONSTRAINT fk_sales_commission_cut_schedule_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_sales_commission_cut_schedule_user FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_sales_commission_cut_schedule_user_company FOREIGN KEY (created_by_user_company_id) REFERENCES user_companies(id) ON DELETE SET NULL
);
