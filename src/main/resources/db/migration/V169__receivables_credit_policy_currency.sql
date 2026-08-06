ALTER TABLE finance_credit_policies
  ADD COLUMN currency_code VARCHAR(3) NOT NULL DEFAULT 'MXN' AFTER customer_name;

