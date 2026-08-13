-- Keep the legacy module gate aligned with effective commercial products.
-- Runtime Root changes use the same source precedence; this backfill repairs
-- benefits created before platform administration synchronized both models.

INSERT INTO company_module_entitlements (company_id, module_slug, status, source)
SELECT DISTINCT benefit.company_id,
       CASE capability.capability_code WHEN 'sales' THEN 'crm' ELSE capability.capability_code END,
       'active',
       'platform_benefit'
FROM company_benefit_grants benefit
JOIN billing_catalog_products product
  ON product.id = benefit.catalog_product_id
 AND product.active = 1
JOIN billing_product_capabilities capability
  ON capability.product_id = product.id
JOIN modules module_row
  ON module_row.slug COLLATE utf8mb4_unicode_ci =
     (CASE capability.capability_code WHEN 'sales' THEN 'crm' ELSE capability.capability_code END)
       COLLATE utf8mb4_unicode_ci
 AND COALESCE(module_row.is_active, 1) = 1
WHERE benefit.benefit_type = 'PRODUCT'
  AND benefit.status = 'ACTIVE'
  AND benefit.starts_at <= CURRENT_TIMESTAMP(6)
  AND (benefit.ends_at IS NULL OR benefit.ends_at > CURRENT_TIMESTAMP(6))
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  source = VALUES(source);

INSERT INTO company_module_entitlements (company_id, module_slug, status, source)
SELECT DISTINCT trial.company_id,
       CASE capability.capability_code WHEN 'sales' THEN 'crm' ELSE capability.capability_code END,
       'active',
       'launch_basic_trial'
FROM company_trial_product_grants trial
JOIN billing_catalog_products product
  ON product.id = trial.catalog_product_id
 AND product.active = 1
JOIN billing_product_capabilities capability
  ON capability.product_id = product.id
JOIN modules module_row
  ON module_row.slug COLLATE utf8mb4_unicode_ci =
     (CASE capability.capability_code WHEN 'sales' THEN 'crm' ELSE capability.capability_code END)
       COLLATE utf8mb4_unicode_ci
 AND COALESCE(module_row.is_active, 1) = 1
WHERE trial.status = 'ACTIVE'
  AND trial.starts_at <= CURRENT_TIMESTAMP(6)
  AND trial.ends_at > CURRENT_TIMESTAMP(6)
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  source = VALUES(source);

INSERT INTO company_module_entitlements (company_id, module_slug, status, source)
SELECT DISTINCT subscription.company_id,
       CASE capability.capability_code WHEN 'sales' THEN 'crm' ELSE capability.capability_code END,
       'active',
       'paid_subscription'
FROM company_billing_subscriptions subscription
JOIN company_billing_subscription_products selected_product
  ON selected_product.subscription_id = subscription.id
JOIN billing_catalog_products product
  ON product.id = selected_product.catalog_product_id
 AND product.active = 1
JOIN billing_product_capabilities capability
  ON capability.product_id = product.id
JOIN modules module_row
  ON module_row.slug COLLATE utf8mb4_unicode_ci =
     (CASE capability.capability_code WHEN 'sales' THEN 'crm' ELSE capability.capability_code END)
       COLLATE utf8mb4_unicode_ci
 AND COALESCE(module_row.is_active, 1) = 1
WHERE LOWER(subscription.status) IN ('trialing', 'active', 'past_due')
  AND (subscription.current_period_ends_at IS NULL OR subscription.current_period_ends_at > CURRENT_TIMESTAMP(6))
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  source = VALUES(source);
