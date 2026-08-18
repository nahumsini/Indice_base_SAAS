-- Idempotent production/demo tenant provisioning for Indice.
--
-- Required session variables:
--   @allow_production_demo = 1
--   @demo_password_hash    = a BCrypt hash for the temporary password
--
-- Optional variables:
--   @demo_company_name     (default: Aceros y Aluminios Regiomontanos Demo)
--   @demo_email            (default: demo.aceros@indiceapp.com)
--   @reset_demo_password   (default: 0; set to 1 for an intentional reset)

SET @demo_company_name := COALESCE(@demo_company_name, 'Aceros y Aluminios Regiomontanos Demo');
SET @demo_email := LOWER(COALESCE(@demo_email, 'demo.aceros@indiceapp.com'));
SET @demo_full_name := COALESCE(@demo_full_name, 'Administrador Demo Industrial');
SET @reset_demo_password := COALESCE(@reset_demo_password, 0);

DELIMITER //
DROP PROCEDURE IF EXISTS assert_industrial_demo_target//
CREATE PROCEDURE assert_industrial_demo_target()
BEGIN
  IF NOT (
    (DATABASE() = 'corazon_testers' AND COALESCE(@allow_production_demo, 0) = 1)
    OR DATABASE() = 'indice_db'
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Refusing to provision the industrial demo in this database';
  END IF;

  IF @demo_password_hash IS NULL OR CHAR_LENGTH(@demo_password_hash) < 50 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'A valid BCrypt @demo_password_hash is required';
  END IF;

  IF (SELECT COUNT(*) FROM companies WHERE LOWER(name) = LOWER(@demo_company_name)) > 1 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'More than one company matches the industrial demo name';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM users user_row
    WHERE LOWER(user_row.email) = @demo_email
      AND NOT EXISTS (
        SELECT 1
        FROM user_companies membership
        JOIN companies company ON company.id = membership.company_id
        WHERE membership.user_id = user_row.id
          AND LOWER(company.name) = LOWER(@demo_company_name)
      )
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'The demo email already belongs to a different tenant';
  END IF;
END//
DELIMITER ;

CALL assert_industrial_demo_target();
DROP PROCEDURE assert_industrial_demo_target;

START TRANSACTION;

INSERT INTO companies
  (name, commercial_account_type, creation_origin)
SELECT @demo_company_name, 'SUPER_ADMIN', 'PLATFORM_ADMIN'
WHERE NOT EXISTS (
  SELECT 1 FROM companies WHERE LOWER(name) = LOWER(@demo_company_name)
);

SELECT id INTO @target_company_id
FROM companies
WHERE LOWER(name) = LOWER(@demo_company_name)
ORDER BY id
LIMIT 1;

INSERT INTO users (email, password_hash, full_name)
SELECT @demo_email, @demo_password_hash, @demo_full_name
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE LOWER(email) = @demo_email
);

SELECT id INTO @target_user_id
FROM users
WHERE LOWER(email) = @demo_email
LIMIT 1;

UPDATE users
SET full_name = @demo_full_name,
    password_hash = CASE WHEN @reset_demo_password = 1 THEN @demo_password_hash ELSE password_hash END
WHERE id = @target_user_id;

UPDATE companies
SET created_by_user_id = COALESCE(created_by_user_id, @target_user_id)
WHERE id = @target_company_id;

INSERT INTO user_companies (user_id, company_id, role, status, visibility)
VALUES (@target_user_id, @target_company_id, 'superadmin', 'active', 'all')
ON DUPLICATE KEY UPDATE
  role = 'superadmin', status = 'active', visibility = 'all';

SELECT id INTO @target_user_company_id
FROM user_companies
WHERE company_id = @target_company_id AND user_id = @target_user_id
LIMIT 1;

INSERT INTO units (company_id, name, description, timezone, status)
SELECT @target_company_id, 'Operación Monterrey',
       'Unidad demo para comercialización y distribución de acero y aluminio.',
       'America/Monterrey', 'active'
WHERE NOT EXISTS (
  SELECT 1 FROM units
  WHERE company_id = @target_company_id AND name = 'Operación Monterrey'
);

SELECT id INTO @target_unit_id
FROM units
WHERE company_id = @target_company_id AND name = 'Operación Monterrey'
ORDER BY id LIMIT 1;

INSERT INTO businesses
  (company_id, unit_id, name, address, description, timezone, status, created_by, updated_by)
SELECT @target_company_id, @target_unit_id, 'Centro Industrial Apodaca',
       'Parque Industrial Demo, Apodaca, Nuevo León',
       'Negocio demo de venta, corte y distribución de metales.',
       'America/Monterrey', 'active', @target_user_id, @target_user_id
WHERE NOT EXISTS (
  SELECT 1 FROM businesses
  WHERE company_id = @target_company_id AND name = 'Centro Industrial Apodaca'
);

SELECT id INTO @target_business_id
FROM businesses
WHERE company_id = @target_company_id AND name = 'Centro Industrial Apodaca'
ORDER BY id LIMIT 1;

INSERT INTO user_work_profiles
  (company_id, user_company_id, user_id, user_code, position, department,
   unit_id, business_id, registration_country, state_province, city,
   status, created_by)
VALUES
  (@target_company_id, @target_user_company_id, @target_user_id, 'DEMO-MTY-ADMIN',
   'Director comercial', 'Dirección', @target_unit_id, @target_business_id,
   'MX', 'Nuevo León', 'Monterrey', 'active', @target_user_id)
ON DUPLICATE KEY UPDATE
  position = VALUES(position), department = VALUES(department),
  unit_id = VALUES(unit_id), business_id = VALUES(business_id),
  registration_country = VALUES(registration_country),
  state_province = VALUES(state_province), city = VALUES(city), status = 'active';

INSERT INTO company_ownerships
  (company_id, owner_user_id, owner_user_company_id, status)
SELECT @target_company_id, @target_user_id, @target_user_company_id, 'ACTIVE'
WHERE NOT EXISTS (
  SELECT 1 FROM company_ownerships WHERE company_id = @target_company_id
);

INSERT INTO company_seat_states
  (company_id, included_seats, purchased_extra_seats, reserved_seats)
VALUES (@target_company_id, 10, 0, 0)
ON DUPLICATE KEY UPDATE included_seats = GREATEST(included_seats, 10);

INSERT INTO company_storage_states
  (company_id, included_bytes, purchased_blocks, used_bytes, reserved_bytes)
VALUES (@target_company_id, 5368709120, 0, 0, 0)
ON DUPLICATE KEY UPDATE included_bytes = GREATEST(included_bytes, 5368709120);

DROP TEMPORARY TABLE IF EXISTS tmp_industrial_demo_modules;
CREATE TEMPORARY TABLE tmp_industrial_demo_modules (
  module_slug varchar(50) PRIMARY KEY
);
INSERT INTO tmp_industrial_demo_modules VALUES
  ('config_center'),('human_resources'),('processes'),('expenses'),('petty_cash'),
  ('pos'),('inventory'),('crm'),('receivables'),('kpis');

INSERT INTO company_module_entitlements (company_id, module_slug, status, source)
SELECT @target_company_id, module.slug, 'active', 'platform_demo'
FROM modules module
JOIN tmp_industrial_demo_modules selected ON selected.module_slug = module.slug
WHERE module.is_active = 1
ON DUPLICATE KEY UPDATE status = 'active', source = 'platform_demo';

INSERT INTO company_subscription_plan_modules (company_id, module_slug, source, status)
SELECT @target_company_id, module.slug, 'platform_demo', 'active'
FROM modules module
JOIN tmp_industrial_demo_modules selected ON selected.module_slug = module.slug
WHERE module.is_active = 1
ON DUPLICATE KEY UPDATE source = 'platform_demo', status = 'active';

INSERT INTO user_company_module_roles (user_company_id, module_slug, role, skill_level)
SELECT @target_user_company_id, module.slug, 'admin', 100
FROM modules module
JOIN tmp_industrial_demo_modules selected ON selected.module_slug = module.slug
WHERE module.is_active = 1
ON DUPLICATE KEY UPDATE role = 'admin', skill_level = 100;

DROP TEMPORARY TABLE IF EXISTS tmp_industrial_demo_tabs;
CREATE TEMPORARY TABLE tmp_industrial_demo_tabs (
  module_slug varchar(50) NOT NULL,
  tab_key varchar(100) NOT NULL,
  PRIMARY KEY (module_slug, tab_key)
);
INSERT INTO tmp_industrial_demo_tabs VALUES
  ('config_center','profile'),('config_center','business-structure'),
  ('config_center','business-profile'),('config_center','personal-performance'),
  ('config_center','users'),
  ('human_resources','collaborators'),('human_resources','attendance'),
  ('human_resources','control'),('human_resources','payroll'),
  ('human_resources','announcements'),('human_resources','assets'),
  ('human_resources','records'),('human_resources','permissions'),
  ('human_resources','incentives'),('human_resources','kpis'),
  ('processes','calendar'),('processes','projects'),('processes','processes'),
  ('processes','kpis'),
  ('expenses','expenses'),('expenses','budgets'),('expenses','providers'),
  ('expenses','accounting'),('expenses','payment-accounts'),('expenses','kpis'),
  ('petty_cash','cash'),('petty_cash','control'),('petty_cash','statements'),
  ('petty_cash','kpis'),
  ('crm','leads'),('crm','contacts'),('crm','quotes'),('crm','sales'),
  ('crm','contracts'),('crm','kpis'),
  ('pos','sale'),('pos','cortes'),('pos','clientes'),('pos','facturacion'),
  ('pos','descuentos'),('pos','kpis'),('pos','kiosks'),
  ('inventory','products'),('inventory','inventory'),('inventory','providers'),
  ('inventory','purchase-orders'),
  ('receivables','credit-sales'),('receivables','accounts-receivable'),
  ('receivables','payments'),('receivables','credit-customers'),
  ('kpis','kpis'),('kpis','accounting-reports'),('kpis','automated-reports');

INSERT INTO user_company_tab_permissions
  (user_company_id, module_slug, tab_key, can_view)
SELECT @target_user_company_id, tab.module_slug, tab.tab_key, 1
FROM tmp_industrial_demo_tabs tab
JOIN tmp_industrial_demo_modules module ON module.module_slug = tab.module_slug
WHERE 1 = 1
ON DUPLICATE KEY UPDATE can_view = 1;

DROP TEMPORARY TABLE IF EXISTS tmp_industrial_demo_providers;
CREATE TEMPORARY TABLE tmp_industrial_demo_providers (
  tax_id varchar(80) PRIMARY KEY,
  name varchar(180) NOT NULL,
  legal_name varchar(220) NOT NULL,
  email varchar(180) NOT NULL,
  phone varchar(60) NOT NULL,
  contact_name varchar(180) NOT NULL,
  payment_terms_days int NOT NULL,
  specialty varchar(120) NOT NULL
);
INSERT INTO tmp_industrial_demo_providers VALUES
  ('DMO010101A01','Aceros Laminados del Norte Demo','Aceros Laminados del Norte Demo, S.A. de C.V.','ventas@aceros-laminados.example','+52 81 5550 0101','Mariana Soto',30,'Lámina, placa y rollo de acero'),
  ('DMO010101A02','Extrusiones Regiomontanas Demo','Extrusiones Regiomontanas Demo, S.A. de C.V.','comercial@extrusiones-regias.example','+52 81 5550 0102','Carlos Guerra',21,'Perfiles y extrusiones de aluminio'),
  ('DMO010101A03','Perfiles Estructurales MX Demo','Perfiles Estructurales MX Demo, S.A. de C.V.','pedidos@perfiles-mx.example','+52 81 5550 0103','Andrea Villarreal',30,'PTR, ángulos, canales y vigas'),
  ('DMO010101A04','Galvanizados del Noreste Demo','Galvanizados del Noreste Demo, S.A. de C.V.','cotizaciones@galvanizados.example','+52 81 5550 0104','Sergio Garza',15,'Acero galvanizado y recubrimientos'),
  ('DMO010101A05','Placas y Soleras Industriales Demo','Placas y Soleras Industriales Demo, S.A. de C.V.','ventas@placas-soleras.example','+52 81 5550 0105','Diana Treviño',30,'Placa, barra y solera'),
  ('DMO010101A06','Aluminio Técnico del Norte Demo','Aluminio Técnico del Norte Demo, S.A. de C.V.','servicio@aluminio-tecnico.example','+52 81 5550 0106','Roberto Cantú',21,'Lámina y placa de aluminio'),
  ('DMO010101A07','Logística Metalúrgica Demo','Logística Metalúrgica Demo, S.A. de C.V.','operaciones@logistica-metal.example','+52 81 5550 0107','Fernanda Leal',15,'Transporte y maniobras de metal'),
  ('DMO010101A08','Consumibles de Corte Demo','Consumibles de Corte Demo, S.A. de C.V.','pedidos@corte-industrial.example','+52 81 5550 0108','Miguel Salinas',7,'Consumibles y preparación de material');

INSERT INTO finance_providers
  (company_id, unit_id, business_id, name, legal_name, tax_id, email, phone,
   contact_name, status, payment_terms_days, notes, created_by_user_id,
   updated_by_user_id, custom_fields_json, metadata_json, deleted_at)
SELECT @target_company_id, @target_unit_id, @target_business_id,
       provider.name, provider.legal_name, provider.tax_id, provider.email,
       provider.phone, provider.contact_name, 'ACTIVE', provider.payment_terms_days,
       CONCAT('Proveedor ficticio para demo comercial. Especialidad: ', provider.specialty),
       @target_user_id, @target_user_id,
       JSON_OBJECT('specialty', provider.specialty),
       JSON_OBJECT('seed', 'industrial-sales-demo-v1', 'fictional', TRUE), NULL
FROM tmp_industrial_demo_providers provider
ON DUPLICATE KEY UPDATE
  unit_id = VALUES(unit_id), business_id = VALUES(business_id),
  name = VALUES(name), legal_name = VALUES(legal_name), email = VALUES(email),
  phone = VALUES(phone), contact_name = VALUES(contact_name), status = 'ACTIVE',
  payment_terms_days = VALUES(payment_terms_days), notes = VALUES(notes),
  custom_fields_json = VALUES(custom_fields_json), metadata_json = VALUES(metadata_json),
  updated_by_user_id = VALUES(updated_by_user_id), deleted_at = NULL;

DROP TEMPORARY TABLE IF EXISTS tmp_industrial_demo_clients;
CREATE TEMPORARY TABLE tmp_industrial_demo_clients (
  contact_code varchar(40) PRIMARY KEY,
  company_name varchar(220) NOT NULL,
  contact_person varchar(180) NOT NULL,
  phone varchar(80) NOT NULL,
  email varchar(220) NOT NULL,
  tax_id varchar(80) NOT NULL,
  city varchar(120) NOT NULL,
  segment varchar(100) NOT NULL
);
INSERT INTO tmp_industrial_demo_clients VALUES
  ('DEMO-MTY-CLI-001','Estructuras del Norte Demo','Alejandro Ríos','+52 81 5551 0201','compras@estructuras-norte.example','DCL010101B01','Monterrey','Construcción estructural'),
  ('DEMO-MTY-CLI-002','Maquinados Santa Catarina Demo','Paola Santos','+52 81 5551 0202','abastecimiento@maquinados-sc.example','DCL010101B02','Santa Catarina','Maquinado industrial'),
  ('DEMO-MTY-CLI-003','Constructora Sierra Regia Demo','Eduardo Lozano','+52 81 5551 0203','proyectos@sierra-regia.example','DCL010101B03','Monterrey','Construcción'),
  ('DEMO-MTY-CLI-004','Cancelería Metropolitana Demo','Natalia Flores','+52 81 5551 0204','pedidos@canceleria-metro.example','DCL010101B04','San Nicolás','Cancelería y aluminio'),
  ('DEMO-MTY-CLI-005','Manufacturas Apodaca Demo','Óscar Zamora','+52 81 5551 0205','compras@manufacturas-apodaca.example','DCL010101B05','Apodaca','Manufactura'),
  ('DEMO-MTY-CLI-006','Proyectos Industriales del Golfo Demo','Regina Torres','+52 81 5551 0206','cotizaciones@proyectos-golfo.example','DCL010101B06','Guadalupe','Ingeniería industrial'),
  ('DEMO-MTY-CLI-007','Talleres Guadalupe Demo','Héctor Mendoza','+52 81 5551 0207','taller@talleres-gpe.example','DCL010101B07','Guadalupe','Taller metalmecánico'),
  ('DEMO-MTY-CLI-008','Soluciones Fotovoltaicas del Norte Demo','Valeria Peña','+52 81 5551 0208','proyectos@solar-norte.example','DCL010101B08','Escobedo','Energía solar'),
  ('DEMO-MTY-CLI-009','Carrocerías Regias Demo','Jorge Elizondo','+52 81 5551 0209','materiales@carrocerias-regias.example','DCL010101B09','Monterrey','Transporte'),
  ('DEMO-MTY-CLI-010','Mobiliario Industrial Demo','Camila Navarro','+52 81 5551 0210','compras@mobiliario-industrial.example','DCL010101B10','San Pedro','Mobiliario'),
  ('DEMO-MTY-CLI-011','Climatización y Ductos Demo','Ricardo Luna','+52 81 5551 0211','almacen@ductos-demo.example','DCL010101B11','Monterrey','HVAC'),
  ('DEMO-MTY-CLI-012','Desarrollos Urbanos Regios Demo','Sofía Valdés','+52 81 5551 0212','obra@desarrollos-regios.example','DCL010101B12','García','Desarrollo inmobiliario');

INSERT INTO sales_contacts
  (company_id, unit_id, business_id, contact_code, company_name, contact_person,
   phone, email, source, status, fiscal_country, fiscal_legal_name, fiscal_tax_id,
   fiscal_city, fiscal_state, fiscal_email, owner_user_company_id, owner_name,
   notes, tags_json, custom_fields_json, metadata_json,
   created_by_user_id, updated_by_user_id, deleted_at)
SELECT @target_company_id, @target_unit_id, @target_business_id,
       client.contact_code, client.company_name, client.contact_person,
       client.phone, client.email, 'demo_industrial', 'active', 'MX',
       client.company_name, client.tax_id, client.city, 'Nuevo León', client.email,
       @target_user_company_id, @demo_full_name,
       'Cliente ficticio para demostración comercial de Índice.',
       JSON_ARRAY('demo','industrial',client.segment),
       JSON_OBJECT('segment', client.segment),
       JSON_OBJECT('seed', 'industrial-sales-demo-v1', 'fictional', TRUE),
       @target_user_id, @target_user_id, NULL
FROM tmp_industrial_demo_clients client
ON DUPLICATE KEY UPDATE
  unit_id = VALUES(unit_id), business_id = VALUES(business_id),
  company_name = VALUES(company_name), contact_person = VALUES(contact_person),
  phone = VALUES(phone), email = VALUES(email), status = 'active',
  fiscal_legal_name = VALUES(fiscal_legal_name), fiscal_tax_id = VALUES(fiscal_tax_id),
  fiscal_city = VALUES(fiscal_city), fiscal_state = VALUES(fiscal_state),
  fiscal_email = VALUES(fiscal_email), owner_user_company_id = VALUES(owner_user_company_id),
  owner_name = VALUES(owner_name), notes = VALUES(notes), tags_json = VALUES(tags_json),
  custom_fields_json = VALUES(custom_fields_json), metadata_json = VALUES(metadata_json),
  updated_by_user_id = VALUES(updated_by_user_id), deleted_at = NULL;

-- This section becomes effective after the industrial product catalog is loaded.
INSERT INTO pos_product_suppliers
  (company_id, product_id, provider_id, provider_sku, cost_amount, currency_code,
   lead_time_days, minimum_order_quantity, is_preferred, is_active, notes,
   created_by_user_id, updated_by_user_id, metadata_json, deleted_at)
SELECT @target_company_id, product.id, provider.id,
       CONCAT('SUP-', REPLACE(product.product_code, 'DEMO-MTY-', '')),
       product.cost, 'MXN',
       CASE WHEN product.category = 'Aluminio' THEN 7 ELSE 5 END,
       1, 1, 1, 'Relación ficticia para demo de abastecimiento.',
       @target_user_id, @target_user_id,
       JSON_OBJECT('seed', 'industrial-sales-demo-v1', 'fictional', TRUE), NULL
FROM sales_products product
JOIN finance_providers provider
  ON provider.company_id = @target_company_id
 AND provider.tax_id = CASE
   WHEN product.category = 'Aluminio' AND product.name LIKE '%Lámina%' THEN 'DMO010101A06'
   WHEN product.category = 'Aluminio' THEN 'DMO010101A02'
   WHEN product.category = 'Acero estructural' OR product.category = 'Acero tubular' THEN 'DMO010101A03'
   WHEN product.name LIKE '%galvanizada%' THEN 'DMO010101A04'
   WHEN product.category = 'Lámina y placa' THEN 'DMO010101A01'
   ELSE 'DMO010101A05'
 END
WHERE product.company_id = @target_company_id
  AND product.product_code LIKE 'DEMO-MTY-%'
  AND product.deleted_at IS NULL
ON DUPLICATE KEY UPDATE
  provider_sku = VALUES(provider_sku), cost_amount = VALUES(cost_amount),
  currency_code = VALUES(currency_code), lead_time_days = VALUES(lead_time_days),
  minimum_order_quantity = VALUES(minimum_order_quantity), is_preferred = 1,
  is_active = 1, notes = VALUES(notes), metadata_json = VALUES(metadata_json),
  updated_by_user_id = VALUES(updated_by_user_id), deleted_at = NULL;

-- Create one available register per demo warehouse after the catalog script creates them.
INSERT INTO pos_cash_registers
  (company_id, unit_id, business_id, warehouse_id, code, name, status, is_active,
   notes, created_by_user_id, updated_by_user_id, metadata_json, deleted_at)
SELECT @target_company_id, @target_unit_id, @target_business_id, warehouse.id,
       CONCAT('DEMO-MTY-REG-', JSON_UNQUOTE(JSON_EXTRACT(warehouse.metadata_json, '$.warehouseKey'))),
       CONCAT('Caja ', warehouse.name), 'ACTIVE', 1,
       'Caja disponible para demostración comercial.',
       @target_user_id, @target_user_id,
       JSON_OBJECT('seed', 'industrial-sales-demo-v1'), NULL
FROM sales_inventory_warehouses warehouse
WHERE warehouse.company_id = @target_company_id
  AND warehouse.warehouse_code LIKE 'DEMO-MTY-WH-%'
  AND warehouse.deleted_at IS NULL
ON DUPLICATE KEY UPDATE
  unit_id = VALUES(unit_id), business_id = VALUES(business_id),
  warehouse_id = VALUES(warehouse_id), name = VALUES(name),
  status = 'ACTIVE', is_active = 1, notes = VALUES(notes),
  metadata_json = VALUES(metadata_json), updated_by_user_id = VALUES(updated_by_user_id),
  deleted_at = NULL;

COMMIT;

SELECT @target_company_id AS company_id, @demo_company_name AS company_name,
       @demo_email AS login_email,
       (SELECT COUNT(*) FROM company_module_entitlements WHERE company_id = @target_company_id AND status = 'active') AS modules,
       (SELECT COUNT(*) FROM finance_providers WHERE company_id = @target_company_id AND deleted_at IS NULL) AS providers,
       (SELECT COUNT(*) FROM sales_contacts WHERE company_id = @target_company_id AND deleted_at IS NULL) AS clients,
       (SELECT COUNT(*) FROM sales_products WHERE company_id = @target_company_id AND product_code LIKE 'DEMO-MTY-%' AND deleted_at IS NULL) AS products,
       (SELECT COUNT(*) FROM pos_cash_registers WHERE company_id = @target_company_id AND deleted_at IS NULL) AS cash_registers;
