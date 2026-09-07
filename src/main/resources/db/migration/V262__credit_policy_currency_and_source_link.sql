-- Preserve every policy and credit sale. New credit operations retain the exact policy they consume.
ALTER TABLE finance_credit_sales
  ADD COLUMN credit_policy_id BIGINT NULL,
  ADD CONSTRAINT fk_credit_sales_policy FOREIGN KEY (credit_policy_id) REFERENCES finance_credit_policies(id) ON DELETE RESTRICT;

ALTER TABLE finance_credit_policies
  ADD COLUMN active_policy_key TINYINT GENERATED ALWAYS AS (IF(deleted_at IS NULL, 1, NULL)) STORED,
  DROP INDEX uq_finance_credit_policies_company_contact,
  ADD UNIQUE KEY uq_credit_policies_contact_currency (company_id, contact_id, currency_code, active_policy_key);
