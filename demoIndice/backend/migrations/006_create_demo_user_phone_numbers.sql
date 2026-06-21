CREATE TABLE IF NOT EXISTS demo_user_phone_numbers (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  account_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  label VARCHAR(40) NOT NULL DEFAULT 'Mobile',
  phone VARCHAR(40) NOT NULL,
  country VARCHAR(10) NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_demo_user_phone_numbers_account
    FOREIGN KEY (account_id) REFERENCES demo_accounts(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_demo_user_phone_numbers_user
    FOREIGN KEY (user_id) REFERENCES demo_account_users(id)
    ON DELETE CASCADE,
  INDEX idx_demo_user_phone_numbers_user (account_id, user_id, sort_order)
);

INSERT INTO demo_user_phone_numbers (account_id, user_id, label, phone, country, is_primary, sort_order)
SELECT account_id, id, 'Mobile', phone, country, TRUE, 0
FROM demo_account_users
WHERE phone IS NOT NULL AND TRIM(phone) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM demo_user_phone_numbers existing
    WHERE existing.account_id = demo_account_users.account_id
      AND existing.user_id = demo_account_users.id
  );
