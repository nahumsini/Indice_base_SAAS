CREATE TABLE IF NOT EXISTS demo_account_users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  account_id BIGINT NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(40) NULL,
  country VARCHAR(10) NULL,
  preferred_language VARCHAR(20) NOT NULL DEFAULT 'en-CA',
  role ENUM('demo_admin', 'superadmin') NOT NULL DEFAULT 'superadmin',
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_demo_account_users_account
    FOREIGN KEY (account_id) REFERENCES demo_accounts(id)
    ON DELETE CASCADE,
  UNIQUE KEY uk_demo_account_users_account_email (account_id, email)
);
