-- Catalogo industrial demo de acero y aluminio para Monterrey.
--
-- Uso predeterminado (El corazon del caribe):
--   docker exec -i indice-mysql-fresh mysql -u indice_user -pindice_pass -D indice_db \
--     < scripts/seed-local-monterrey-industrial-demo.sql
--
-- Para otra empresa, definir antes @target_company_id y ejecutar el archivo desde
-- una sesion mysql. Produccion exige ademas @allow_production_demo = 1. La carga es
-- repetible y solo administra codigos DEMO-MTY-*.

DELIMITER //
DROP PROCEDURE IF EXISTS assert_local_monterrey_demo//
CREATE PROCEDURE assert_local_monterrey_demo()
BEGIN
  IF DATABASE() = 'indice_db' THEN
    SET @monterrey_demo_environment := 'local';
  ELSEIF DATABASE() = 'corazon_testers' AND COALESCE(@allow_production_demo, 0) = 1 THEN
    SET @monterrey_demo_environment := 'production';
  ELSE
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Refusing to run Monterrey demo outside an explicitly authorized database';
  END IF;

  IF @target_company_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM companies WHERE id = @target_company_id
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'A valid @target_company_id is required';
  END IF;
END//
DELIMITER ;

SET @target_company_id := COALESCE(
  @target_company_id,
  (SELECT id FROM companies WHERE name = 'El corazon del caribe' ORDER BY id LIMIT 1)
);
CALL assert_local_monterrey_demo();
DROP PROCEDURE assert_local_monterrey_demo;

SET @target_user_id := COALESCE(
  @target_user_id,
  (
    SELECT uc.user_id
    FROM user_companies uc
    WHERE uc.company_id = @target_company_id
      AND LOWER(uc.status) = 'active'
    ORDER BY uc.id
    LIMIT 1
  )
);
SET @target_unit_id := (
  SELECT id FROM units
  WHERE company_id = @target_company_id
  ORDER BY (name = 'Monterrey Linda vista') DESC, id
  LIMIT 1
);
SET @target_unit_name := (
  SELECT name FROM units WHERE id = @target_unit_id LIMIT 1
);
SET @target_business_id := (
  SELECT id FROM businesses
  WHERE company_id = @target_company_id
    AND (unit_id = @target_unit_id OR @target_unit_id IS NULL)
  ORDER BY (name = 'Monterrey Linda vista headquarters') DESC, id
  LIMIT 1
);
SET @target_business_name := (
  SELECT name FROM businesses WHERE id = @target_business_id LIMIT 1
);

DROP TEMPORARY TABLE IF EXISTS tmp_demo_mty_products;
CREATE TEMPORARY TABLE tmp_demo_mty_products (
  source_code varchar(40) PRIMARY KEY,
  sku varchar(80) NOT NULL,
  product_name varchar(220) NOT NULL,
  category varchar(100) NOT NULL,
  material varchar(80) NOT NULL,
  shape varchar(80) NOT NULL,
  grade varchar(80) NOT NULL,
  temper varchar(40) NULL,
  dimensions varchar(160) NOT NULL,
  finish varchar(80) NOT NULL,
  standard_name varchar(80) NOT NULL,
  unit_name varchar(20) NOT NULL,
  unit_cost decimal(15,2) NOT NULL,
  unit_price decimal(15,2) NOT NULL,
  minimum_stock decimal(15,2) NOT NULL,
  apodaca_available decimal(15,2) NOT NULL,
  apodaca_reserved decimal(15,2) NOT NULL,
  guadalupe_available decimal(15,2) NOT NULL,
  guadalupe_reserved decimal(15,2) NOT NULL,
  preparation_available decimal(15,2) NOT NULL,
  priority varchar(20) NOT NULL
);

INSERT INTO tmp_demo_mty_products VALUES
  ('ACE-PTR-001','PTR-1X1-C14-6M','PTR cuadrado 1 x 1 cal. 14, 6 m','Acero tubular','Acero al carbón','PTR cuadrado','A500',NULL,'1 x 1 in, cal. 14, 6 m','Negro','ASTM A500','PZA',178,245,30,70,8,42,4,6,'Alta'),
  ('ACE-PTR-002','PTR-1.5X1.5-C14-6M','PTR cuadrado 1 1/2 x 1 1/2 cal. 14, 6 m','Acero tubular','Acero al carbón','PTR cuadrado','A500',NULL,'1.5 x 1.5 in, cal. 14, 6 m','Negro','ASTM A500','PZA',286,395,24,48,5,35,3,4,'Alta'),
  ('ACE-PTR-003','PTR-2X2-C14-6M','PTR cuadrado 2 x 2 cal. 14, 6 m','Acero tubular','Acero al carbón','PTR cuadrado','A500',NULL,'2 x 2 in, cal. 14, 6 m','Negro','ASTM A500','PZA',392,535,20,41,4,28,2,3,'Alta'),
  ('ACE-PTR-004','PTR-2X2-C11-6M','PTR cuadrado 2 x 2 cal. 11, 6 m','Acero tubular','Acero al carbón','PTR cuadrado','A500',NULL,'2 x 2 in, cal. 11, 6 m','Negro','ASTM A500','PZA',612,835,14,27,3,18,2,2,'Alta'),
  ('ACE-PTR-005','PTR-2X1-C14-6M','PTR rectangular 2 x 1 cal. 14, 6 m','Acero tubular','Acero al carbón','PTR rectangular','A500',NULL,'2 x 1 in, cal. 14, 6 m','Negro','ASTM A500','PZA',298,415,18,36,4,23,2,3,'Alta'),
  ('ACE-PTR-006','PTR-3X1.5-C14-6M','PTR rectangular 3 x 1 1/2 cal. 14, 6 m','Acero tubular','Acero al carbón','PTR rectangular','A500',NULL,'3 x 1.5 in, cal. 14, 6 m','Negro','ASTM A500','PZA',438,598,12,25,2,16,1,2,'Media'),
  ('ACE-TUB-001','TUB-RED-1-C14-6M','Tubo redondo 1 in cal. 14, 6 m','Acero tubular','Acero al carbón','Tubo redondo','A500',NULL,'1 in, cal. 14, 6 m','Negro','ASTM A500','PZA',185,255,24,52,5,31,3,3,'Alta'),
  ('ACE-TUB-002','TUB-CED40-1-6M','Tubo cédula 40 de 1 in, 6 m','Acero tubular','Acero al carbón','Tubo cédula','A53',NULL,'1 in, cédula 40, 6 m','Negro','ASTM A53','PZA',465,625,12,22,2,14,1,2,'Media'),
  ('ACE-ANG-001','ANG-1.5X1.5X1.8-6M','Ángulo 1 1/2 x 1 1/2 x 1/8, 6 m','Acero estructural','Acero al carbón','Ángulo','A36',NULL,'1.5 x 1.5 x 0.125 in, 6 m','Negro','ASTM A36','PZA',348,475,18,33,3,24,2,2,'Alta'),
  ('ACE-ANG-002','ANG-2X2X1.8-6M','Ángulo 2 x 2 x 1/8, 6 m','Acero estructural','Acero al carbón','Ángulo','A36',NULL,'2 x 2 x 0.125 in, 6 m','Negro','ASTM A36','PZA',472,645,15,29,3,18,2,2,'Alta'),
  ('ACE-CAN-001','CAN-C4X5.4-6M','Canal estructural C4 x 5.4, 6 m','Acero estructural','Acero al carbón','Canal C','A36',NULL,'C4 x 5.4 lb/ft, 6 m','Negro','ASTM A36','PZA',1120,1465,8,13,1,9,1,1,'Media'),
  ('ACE-VIG-001','IPR-6X4-6M','Viga IPR 6 x 4, 6 m','Acero estructural','Acero al carbón','Viga IPR','A992',NULL,'6 x 4 in, 6 m','Negro','ASTM A992','PZA',2380,3025,5,8,1,6,0,1,'Media'),
  ('ACE-SOL-001','SOL-1X1.8-6M','Solera 1 x 1/8, 6 m','Barras y soleras','Acero al carbón','Solera','A36',NULL,'1 x 0.125 in, 6 m','Negro','ASTM A36','PZA',148,205,30,61,6,38,4,4,'Alta'),
  ('ACE-SOL-002','SOL-2X1.8-6M','Solera 2 x 1/8, 6 m','Barras y soleras','Acero al carbón','Solera','A36',NULL,'2 x 0.125 in, 6 m','Negro','ASTM A36','PZA',292,398,22,44,4,27,3,3,'Alta'),
  ('ACE-RED-001','RED-LISA-3.8-6M','Redondo liso 3/8, 6 m','Barras y soleras','Acero al carbón','Barra redonda','A36',NULL,'3/8 in, 6 m','Negro','ASTM A36','PZA',86,125,40,85,8,56,5,6,'Alta'),
  ('ACE-CUA-001','CUA-1.2-6M','Cuadrado macizo 1/2, 6 m','Barras y soleras','Acero al carbón','Barra cuadrada','A36',NULL,'1/2 in, 6 m','Negro','ASTM A36','PZA',165,228,24,47,4,31,3,3,'Media'),
  ('ACE-VAR-001','VAR-3.8-12M','Varilla corrugada 3/8, 12 m','Barras y soleras','Acero al carbón','Varilla corrugada','Grado 42',NULL,'3/8 in, 12 m','Natural','NMX-B-506','PZA',136,179,50,110,12,74,7,8,'Alta'),
  ('ACE-LAM-001','LAM-NGR-C18-3X8','Lámina negra cal. 18, 3 x 8 ft','Lámina y placa','Acero al carbón','Lámina','SAE 1008',NULL,'Cal. 18, 3 x 8 ft','Negro','ASTM A1008','PZA',735,965,12,23,2,15,1,2,'Alta'),
  ('ACE-LAM-002','LAM-NGR-C14-4X8','Lámina negra cal. 14, 4 x 8 ft','Lámina y placa','Acero al carbón','Lámina','SAE 1008',NULL,'Cal. 14, 4 x 8 ft','Negro','ASTM A1008','PZA',1540,1985,8,14,1,9,1,1,'Alta'),
  ('ACE-LAM-003','LAM-GAL-C26-3X8','Lámina galvanizada cal. 26, 3 x 8 ft','Lámina y placa','Acero galvanizado','Lámina','G60',NULL,'Cal. 26, 3 x 8 ft','Galvanizado','ASTM A653','PZA',485,675,15,31,3,20,2,2,'Alta'),
  ('ACE-PLAC-001','PLAC-A36-1.8-4X8','Placa A36 de 1/8, 4 x 8 ft','Lámina y placa','Acero al carbón','Placa','A36',NULL,'1/8 in, 4 x 8 ft','Negro','ASTM A36','PZA',2460,3095,5,9,1,6,0,1,'Media'),
  ('ACE-PLAC-002','PLAC-A36-1.4-4X8','Placa A36 de 1/4, 4 x 8 ft','Lámina y placa','Acero al carbón','Placa','A36',NULL,'1/4 in, 4 x 8 ft','Negro','ASTM A36','PZA',4860,5980,3,5,0,4,0,1,'Media'),
  ('ALU-PER-001','ALU-ANG-6063-1X1','Ángulo aluminio 6063-T5 de 1 x 1, 6 m','Aluminio','Aluminio','Ángulo','6063','T5','1 x 1 x 1/8 in, 6 m','Natural','ASTM B221','PZA',545,735,10,18,2,13,1,2,'Alta'),
  ('ALU-PER-002','ALU-CUA-6063-1X1','Perfil cuadrado aluminio 6063-T5 de 1 x 1, 6 m','Aluminio','Aluminio','Perfil cuadrado','6063','T5','1 x 1 x 1/8 in, 6 m','Natural','ASTM B221','PZA',825,1085,8,15,1,10,1,1,'Alta'),
  ('ALU-PER-003','ALU-REC-6063-2X1','Perfil rectangular aluminio 6063-T5 de 2 x 1, 6 m','Aluminio','Aluminio','Perfil rectangular','6063','T5','2 x 1 x 1/8 in, 6 m','Natural','ASTM B221','PZA',1190,1535,6,11,1,8,1,1,'Alta'),
  ('ALU-TUB-001','ALU-TUB-6063-1','Tubo redondo aluminio 6063-T5 de 1 in, 6 m','Aluminio','Aluminio','Tubo redondo','6063','T5','1 x 0.062 in, 6 m','Natural','ASTM B221','PZA',485,665,10,21,2,13,1,2,'Media'),
  ('ALU-LAM-001','ALU-LAM-3003-C22-4X8','Lámina aluminio 3003-H14 cal. 22, 4 x 8 ft','Aluminio','Aluminio','Lámina','3003','H14','Cal. 22, 4 x 8 ft','Mill finish','ASTM B209','PZA',1320,1745,6,12,1,7,1,1,'Alta'),
  ('ALU-LAM-002','ALU-LAM-3003-C18-4X8','Lámina aluminio 3003-H14 cal. 18, 4 x 8 ft','Aluminio','Aluminio','Lámina','3003','H14','Cal. 18, 4 x 8 ft','Mill finish','ASTM B209','PZA',2260,2895,4,8,1,5,0,1,'Media'),
  ('ALU-PLAC-001','ALU-PLAC-6061-1.8-4X8','Placa aluminio 6061-T6 de 1/8, 4 x 8 ft','Aluminio','Aluminio','Placa','6061','T6','1/8 in, 4 x 8 ft','Mill finish','ASTM B209','PZA',4380,5480,3,5,0,3,0,1,'Media'),
  ('ALU-SOL-001','ALU-SOL-6061-2X1.4','Solera aluminio 6061-T6 de 2 x 1/4, 6 m','Aluminio','Aluminio','Solera','6061','T6','2 x 1/4 in, 6 m','Natural','ASTM B221','PZA',1740,2225,5,9,1,6,0,1,'Media');

DROP TEMPORARY TABLE IF EXISTS tmp_demo_mty_warehouses;
CREATE TEMPORARY TABLE tmp_demo_mty_warehouses (
  warehouse_key varchar(10) PRIMARY KEY,
  warehouse_code varchar(40) NOT NULL,
  warehouse_name varchar(180) NOT NULL,
  jurisdiction varchar(180) NOT NULL,
  address_note varchar(255) NOT NULL,
  minimum_share decimal(5,4) NOT NULL
);

INSERT INTO tmp_demo_mty_warehouses VALUES
  ('APO','DEMO-MTY-WH-APODACA','Monterrey · Apodaca','Apodaca, Nuevo León','Almacén demo de producto terminado',0.4500),
  ('GPE','DEMO-MTY-WH-GUADALUPE','Monterrey · Guadalupe','Guadalupe, Nuevo León','Almacén demo de distribución',0.3500),
  ('PREP','DEMO-MTY-WH-CORTE','Monterrey · Corte y preparación','Monterrey, Nuevo León','Área demo de corte y preparación',0.2000);

START TRANSACTION;

INSERT INTO sales_products
  (company_id, product_code, sku, name, description, category, type, price, cost,
   currency, tax_category, status, visibility, inventory_ready, pos_ready,
   custom_fields_json, metadata_json, created_by_user_id, updated_by_user_id, deleted_at)
SELECT
  @target_company_id,
  CONCAT('DEMO-MTY-', p.source_code),
  CONCAT('DEMO-MTY-', p.sku),
  p.product_name,
  CONCAT(p.material, ' · ', p.shape, ' · ', p.dimensions, ' · ', p.standard_name),
  p.category,
  'product',
  p.unit_price,
  p.unit_cost,
  'MXN',
  'standard',
  'active',
  'commercial',
  1,
  1,
  JSON_OBJECT(
    'material', p.material,
    'shape', p.shape,
    'grade', p.grade,
    'temper', p.temper,
    'dimensions', p.dimensions,
    'finish', p.finish,
    'standard', p.standard_name,
    'unit', p.unit_name,
    'priority', p.priority
  ),
  JSON_OBJECT(
    'seed', 'demo-mty-industrial-v1',
    'sourceCode', p.source_code,
    'globalMinimumStock', p.minimum_stock,
    'illustrativePrices', TRUE
  ),
  @target_user_id,
  @target_user_id,
  NULL
FROM tmp_demo_mty_products p
ON DUPLICATE KEY UPDATE
  sku = VALUES(sku),
  name = VALUES(name),
  description = VALUES(description),
  category = VALUES(category),
  type = VALUES(type),
  price = VALUES(price),
  cost = VALUES(cost),
  currency = VALUES(currency),
  tax_category = VALUES(tax_category),
  status = VALUES(status),
  visibility = VALUES(visibility),
  inventory_ready = VALUES(inventory_ready),
  pos_ready = VALUES(pos_ready),
  custom_fields_json = VALUES(custom_fields_json),
  metadata_json = VALUES(metadata_json),
  updated_by_user_id = VALUES(updated_by_user_id),
  deleted_at = NULL;

INSERT INTO sales_inventory_warehouses
  (company_id, warehouse_code, name, type, business_unit_id, business_unit_name,
   business_id, business_name, jurisdiction, responsible_user_id, responsible_name,
   address_note, status, last_movement_at, metadata_json,
   created_by_user_id, updated_by_user_id, deleted_at)
SELECT
  @target_company_id,
  w.warehouse_code,
  w.warehouse_name,
  'businessWarehouse',
  CAST(@target_unit_id AS CHAR),
  @target_unit_name,
  CAST(@target_business_id AS CHAR),
  @target_business_name,
  w.jurisdiction,
  CAST(@target_user_id AS CHAR),
  (SELECT full_name FROM users WHERE id = @target_user_id),
  w.address_note,
  'active',
  CURRENT_DATE,
  JSON_OBJECT('seed', 'demo-mty-industrial-v1', 'warehouseKey', w.warehouse_key),
  @target_user_id,
  @target_user_id,
  NULL
FROM tmp_demo_mty_warehouses w
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  type = VALUES(type),
  business_unit_id = VALUES(business_unit_id),
  business_unit_name = VALUES(business_unit_name),
  business_id = VALUES(business_id),
  business_name = VALUES(business_name),
  jurisdiction = VALUES(jurisdiction),
  responsible_user_id = VALUES(responsible_user_id),
  responsible_name = VALUES(responsible_name),
  address_note = VALUES(address_note),
  status = VALUES(status),
  last_movement_at = VALUES(last_movement_at),
  metadata_json = VALUES(metadata_json),
  updated_by_user_id = VALUES(updated_by_user_id),
  deleted_at = NULL;

INSERT INTO sales_inventory_balances
  (company_id, balance_code, product_id, warehouse_id, warehouse_name,
   available_quantity, reserved_quantity, minimum_quantity, unit_cost, uses_inventory,
   business_unit_id, business_unit_name, business_id, business_name, last_movement_at,
   metadata_json, created_by_user_id, updated_by_user_id, deleted_at)
SELECT
  @target_company_id,
  CONCAT('DMTY-', p.source_code, '-', w.warehouse_key),
  product.id,
  warehouse.id,
  warehouse.name,
  CASE w.warehouse_key
    WHEN 'APO' THEN p.apodaca_available
    WHEN 'GPE' THEN p.guadalupe_available
    ELSE p.preparation_available
  END,
  CASE w.warehouse_key
    WHEN 'APO' THEN p.apodaca_reserved
    WHEN 'GPE' THEN p.guadalupe_reserved
    ELSE 0
  END,
  CASE w.warehouse_key
    WHEN 'APO' THEN ROUND(p.minimum_stock * 0.45, 0)
    WHEN 'GPE' THEN ROUND(p.minimum_stock * 0.35, 0)
    ELSE p.minimum_stock - ROUND(p.minimum_stock * 0.45, 0) - ROUND(p.minimum_stock * 0.35, 0)
  END,
  p.unit_cost,
  1,
  CAST(@target_unit_id AS CHAR),
  @target_unit_name,
  CAST(@target_business_id AS CHAR),
  @target_business_name,
  CURRENT_DATE,
  JSON_OBJECT(
    'seed', 'demo-mty-industrial-v1',
    'warehouseKey', w.warehouse_key,
    'globalMinimumStock', p.minimum_stock
  ),
  @target_user_id,
  @target_user_id,
  NULL
FROM tmp_demo_mty_products p
CROSS JOIN tmp_demo_mty_warehouses w
JOIN sales_products product
  ON product.company_id = @target_company_id
 AND product.product_code = CONCAT('DEMO-MTY-', p.source_code)
JOIN sales_inventory_warehouses warehouse
  ON warehouse.company_id = @target_company_id
 AND warehouse.warehouse_code = w.warehouse_code
WHERE 1 = 1
ON DUPLICATE KEY UPDATE
  balance_code = VALUES(balance_code),
  warehouse_name = VALUES(warehouse_name),
  available_quantity = VALUES(available_quantity),
  reserved_quantity = VALUES(reserved_quantity),
  minimum_quantity = VALUES(minimum_quantity),
  unit_cost = VALUES(unit_cost),
  uses_inventory = VALUES(uses_inventory),
  business_unit_id = VALUES(business_unit_id),
  business_unit_name = VALUES(business_unit_name),
  business_id = VALUES(business_id),
  business_name = VALUES(business_name),
  last_movement_at = VALUES(last_movement_at),
  metadata_json = VALUES(metadata_json),
  updated_by_user_id = VALUES(updated_by_user_id),
  deleted_at = NULL;

INSERT INTO sales_inventory_movements
  (company_id, movement_number, group_id, product_id, product_name, product_sku,
   movement_type, quantity, unit_cost, to_warehouse_id, to_warehouse_name,
   business_unit_id, business_unit_name, business_id, business_name,
   reason, reference, responsible_name, movement_date, status, metadata_json,
   created_by_user_id, updated_by_user_id)
SELECT
  @target_company_id,
  CONCAT('DMTY-OPEN-', p.source_code, '-', w.warehouse_key),
  'DEMO-MTY-OPENING',
  product.id,
  product.name,
  product.sku,
  'opening_stock',
  CASE w.warehouse_key
    WHEN 'APO' THEN p.apodaca_available + p.apodaca_reserved
    WHEN 'GPE' THEN p.guadalupe_available + p.guadalupe_reserved
    ELSE p.preparation_available
  END,
  p.unit_cost,
  warehouse.id,
  warehouse.name,
  CAST(@target_unit_id AS CHAR),
  @target_unit_name,
  CAST(@target_business_id AS CHAR),
  @target_business_name,
  'Carga inicial del catálogo demo industrial Monterrey',
  'DEMO-MTY-OPENING',
  (SELECT full_name FROM users WHERE id = @target_user_id),
  CURRENT_DATE,
  'posted',
  JSON_OBJECT('seed', 'demo-mty-industrial-v1', 'warehouseKey', w.warehouse_key),
  @target_user_id,
  @target_user_id
FROM tmp_demo_mty_products p
CROSS JOIN tmp_demo_mty_warehouses w
JOIN sales_products product
  ON product.company_id = @target_company_id
 AND product.product_code = CONCAT('DEMO-MTY-', p.source_code)
JOIN sales_inventory_warehouses warehouse
  ON warehouse.company_id = @target_company_id
 AND warehouse.warehouse_code = w.warehouse_code
WHERE NOT EXISTS (
  SELECT 1
  FROM sales_inventory_movements movement
  WHERE movement.company_id = @target_company_id
    AND movement.movement_number = CONCAT('DMTY-OPEN-', p.source_code, '-', w.warehouse_key)
);

COMMIT;

SELECT
  @target_company_id AS company_id,
  (SELECT name FROM companies WHERE id = @target_company_id) AS company_name,
  COUNT(DISTINCT product.id) AS demo_products,
  COUNT(DISTINCT balance.warehouse_id) AS demo_warehouses,
  COUNT(balance.id) AS demo_balances,
  SUM(balance.available_quantity) AS available_units,
  SUM(balance.reserved_quantity) AS reserved_units,
  SUM(balance.available_quantity * balance.unit_cost) AS available_inventory_value_mxn
FROM sales_products product
LEFT JOIN sales_inventory_balances balance
  ON balance.company_id = product.company_id
 AND balance.product_id = product.id
 AND balance.deleted_at IS NULL
WHERE product.company_id = @target_company_id
  AND product.product_code LIKE 'DEMO-MTY-%'
  AND product.deleted_at IS NULL;
