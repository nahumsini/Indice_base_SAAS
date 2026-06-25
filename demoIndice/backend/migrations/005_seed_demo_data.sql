INSERT INTO demo_accounts (company_name, company_slug, environment, destination_url, status)
VALUES
  ('Indice Demo', 'indice-demo', 'demo', NULL, 'active'),
  ('Acme Manufacturing', 'acme-manufacturing', 'external', 'https://app.indice.com', 'active'),
  ('Northwind Group', 'northwind-group', 'external', 'https://northwind.indice.com', 'active')
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  environment = VALUES(environment),
  destination_url = VALUES(destination_url),
  status = VALUES(status);

INSERT INTO demo_account_users (
  account_id, email, password_hash, first_name, last_name, phone, country, preferred_language, role, status
)
SELECT id, 'demo@indice.com',
  '$argon2id$v=19$m=65536,t=3,p=4$ZNgQc+Ia7Jmp+n2OSPP+FQ$q+uEMXS4AMsjv+bBOpvH52WrmPo7pz7iW0V7VOCjHNk',
  'Demo', 'Admin', '+1 555 0100', 'CA', 'en-CA', 'demo_admin', 'active'
FROM demo_accounts
WHERE company_slug = 'indice-demo'
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  first_name = VALUES(first_name),
  last_name = VALUES(last_name),
  phone = VALUES(phone),
  country = VALUES(country),
  preferred_language = VALUES(preferred_language),
  role = VALUES(role),
  status = VALUES(status);

INSERT INTO demo_account_company_profiles (
  account_id, industry, business_model, description, currency, timezone, company_size, collaborators, structure_type
)
SELECT id, 'Operations', 'SaaS', 'Demo company for the Indice Home Panel.',
  'CAD', 'America/Toronto', '11-50', 24, 'simple'
FROM demo_accounts
WHERE company_slug = 'indice-demo'
ON DUPLICATE KEY UPDATE
  industry = VALUES(industry),
  business_model = VALUES(business_model),
  description = VALUES(description),
  currency = VALUES(currency),
  timezone = VALUES(timezone),
  company_size = VALUES(company_size),
  collaborators = VALUES(collaborators),
  structure_type = VALUES(structure_type);

INSERT IGNORE INTO demo_business_profile_sections (account_id, section_key, data_json)
SELECT id, section_key, JSON_OBJECT(
  'ui_key', ui_key,
  'answers', JSON_OBJECT(),
  'saved_at', NULL,
  'answered_count', 0,
  'question_count', 10
)
FROM demo_accounts
JOIN (
  SELECT 'people' section_key, 'personas' ui_key
  UNION ALL SELECT 'processes', 'procesos'
  UNION ALL SELECT 'products', 'productos'
  UNION ALL SELECT 'finance', 'finanzas'
) sections
WHERE company_slug = 'indice-demo';

INSERT IGNORE INTO demo_personal_performance_sections (account_id, user_id, section_key, data_json)
SELECT accounts.id, users.id, sections.section_key, JSON_OBJECT(
  'ui_key', sections.section_key,
  'answers', JSON_OBJECT(),
  'saved_at', NULL,
  'answered_count', 0,
  'question_count', 10
)
FROM demo_accounts accounts
JOIN demo_account_users users ON users.account_id = accounts.id
JOIN (
  SELECT 'sleep_recovery' section_key
  UNION ALL SELECT 'nutrition_energy'
  UNION ALL SELECT 'stress_clarity'
  UNION ALL SELECT 'balance_sustainability'
) sections
WHERE accounts.company_slug = 'indice-demo' AND users.email = 'demo@indice.com';
