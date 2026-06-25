CREATE TABLE IF NOT EXISTS demo_account_company_profiles (
  account_id BIGINT PRIMARY KEY,
  industry VARCHAR(160) NULL,
  business_model VARCHAR(160) NULL,
  description TEXT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'CAD',
  timezone VARCHAR(80) NOT NULL DEFAULT 'America/Toronto',
  company_size VARCHAR(80) NULL,
  collaborators INT NOT NULL DEFAULT 0,
  structure_type ENUM('simple', 'multi') NOT NULL DEFAULT 'simple',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_demo_company_profiles_account
    FOREIGN KEY (account_id) REFERENCES demo_accounts(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS demo_business_units (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  account_id BIGINT NOT NULL,
  name VARCHAR(160) NOT NULL,
  is_corporate_office BOOLEAN NOT NULL DEFAULT FALSE,
  address_json JSON NULL,
  location_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_demo_business_units_account
    FOREIGN KEY (account_id) REFERENCES demo_accounts(id)
    ON DELETE CASCADE,
  INDEX idx_demo_business_units_account (account_id)
);

CREATE TABLE IF NOT EXISTS demo_business_locations (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  account_id BIGINT NOT NULL,
  unit_id BIGINT NOT NULL,
  name VARCHAR(160) NOT NULL,
  address_json JSON NULL,
  location_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_demo_business_locations_account
    FOREIGN KEY (account_id) REFERENCES demo_accounts(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_demo_business_locations_unit
    FOREIGN KEY (unit_id) REFERENCES demo_business_units(id)
    ON DELETE CASCADE,
  INDEX idx_demo_business_locations_account (account_id)
);

CREATE TABLE IF NOT EXISTS demo_business_profile_sections (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  account_id BIGINT NOT NULL,
  section_key ENUM('people', 'processes', 'products', 'finance') NOT NULL,
  status ENUM('draft', 'in_progress', 'completed') NOT NULL DEFAULT 'draft',
  data_json JSON NOT NULL,
  completed_at DATETIME NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_demo_business_profile_sections_account
    FOREIGN KEY (account_id) REFERENCES demo_accounts(id)
    ON DELETE CASCADE,
  UNIQUE KEY uk_demo_business_profile_section (account_id, section_key)
);

CREATE TABLE IF NOT EXISTS demo_personal_performance_sections (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  account_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  section_key ENUM('sleep_recovery', 'nutrition_energy', 'stress_clarity', 'balance_sustainability') NOT NULL,
  status ENUM('draft', 'in_progress', 'completed') NOT NULL DEFAULT 'draft',
  data_json JSON NOT NULL,
  completed_at DATETIME NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_demo_personal_sections_account
    FOREIGN KEY (account_id) REFERENCES demo_accounts(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_demo_personal_sections_user
    FOREIGN KEY (user_id) REFERENCES demo_account_users(id)
    ON DELETE CASCADE,
  UNIQUE KEY uk_demo_personal_section (account_id, user_id, section_key)
);
