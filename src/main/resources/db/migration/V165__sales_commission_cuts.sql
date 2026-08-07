CREATE TABLE IF NOT EXISTS sales_commission_cuts (
  id BIGINT NOT NULL AUTO_INCREMENT,
  company_id BIGINT NOT NULL,
  cut_code VARCHAR(40) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'sent_to_hr',
  total_amount DECIMAL(20,2) NOT NULL DEFAULT 0,
  commission_count INT NOT NULL DEFAULT 0,
  employee_count INT NOT NULL DEFAULT 0,
  created_by_user_id BIGINT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_sales_commission_cuts_company_code (company_id, cut_code),
  KEY idx_sales_commission_cuts_period (company_id, period_start, period_end),
  CONSTRAINT fk_sales_commission_cuts_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_sales_commission_cuts_user FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sales_commission_cut_items (
  id BIGINT NOT NULL AUTO_INCREMENT,
  cut_id BIGINT NOT NULL,
  company_id BIGINT NOT NULL,
  sale_id BIGINT NOT NULL,
  user_company_id BIGINT NOT NULL,
  amount DECIMAL(20,2) NOT NULL,
  currency_code CHAR(3) NOT NULL,
  hr_incentive_id BIGINT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_sales_commission_cut_sale (company_id, sale_id),
  KEY idx_sales_commission_cut_items_cut (cut_id),
  KEY idx_sales_commission_cut_items_employee (company_id, user_company_id),
  CONSTRAINT fk_sales_commission_cut_items_cut FOREIGN KEY (cut_id) REFERENCES sales_commission_cuts(id) ON DELETE CASCADE,
  CONSTRAINT fk_sales_commission_cut_items_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_sales_commission_cut_items_sale FOREIGN KEY (sale_id) REFERENCES sales_records(id) ON DELETE RESTRICT,
  CONSTRAINT fk_sales_commission_cut_items_employee FOREIGN KEY (user_company_id) REFERENCES user_companies(id) ON DELETE RESTRICT,
  CONSTRAINT fk_sales_commission_cut_items_incentive FOREIGN KEY (hr_incentive_id) REFERENCES hr_incentives(id) ON DELETE SET NULL
);
