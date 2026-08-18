-- Catalogo demo para Inventarios y POS / Kioscos.
--
-- Crea o actualiza 10 productos de consumo, un almacen demo y sus existencias.
-- La carga es repetible y solo administra codigos DEMO-KIOSK-*.
--
-- Empresa predeterminada: Empresa Demo Spring.
-- Para usar otra empresa, definir @target_company_id antes de ejecutar el archivo.

DELIMITER //
DROP PROCEDURE IF EXISTS assert_local_pos_kiosk_catalog//
CREATE PROCEDURE assert_local_pos_kiosk_catalog()
BEGIN
  IF DATABASE() <> 'indice_db' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Refusing to run the POS kiosk demo catalog outside indice_db';
  END IF;

  IF @target_company_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM companies WHERE id = @target_company_id
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Empresa Demo Spring was not found; provide a valid @target_company_id';
  END IF;
END//
DELIMITER ;

SET @target_company_id := COALESCE(
  @target_company_id,
  (
    SELECT id
    FROM companies
    WHERE LOWER(TRIM(name)) = LOWER('Empresa Demo Spring')
    ORDER BY id
    LIMIT 1
  )
);

CALL assert_local_pos_kiosk_catalog();
DROP PROCEDURE assert_local_pos_kiosk_catalog;

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
  SELECT id
  FROM units
  WHERE company_id = @target_company_id
  ORDER BY id
  LIMIT 1
);
SET @target_unit_name := (
  SELECT name FROM units WHERE id = @target_unit_id LIMIT 1
);
SET @target_business_id := (
  SELECT id
  FROM businesses
  WHERE company_id = @target_company_id
    AND (unit_id = @target_unit_id OR @target_unit_id IS NULL)
  ORDER BY id
  LIMIT 1
);
SET @target_business_name := (
  SELECT name FROM businesses WHERE id = @target_business_id LIMIT 1
);

DROP TEMPORARY TABLE IF EXISTS tmp_demo_kiosk_products;
CREATE TEMPORARY TABLE tmp_demo_kiosk_products (
  source_code varchar(20) PRIMARY KEY,
  sku varchar(80) NOT NULL,
  barcode varchar(40) NOT NULL,
  product_name varchar(220) NOT NULL,
  product_description varchar(255) NOT NULL,
  category varchar(100) NOT NULL,
  brand varchar(80) NOT NULL,
  presentation varchar(80) NOT NULL,
  unit_name varchar(20) NOT NULL,
  unit_cost decimal(15,2) NOT NULL,
  unit_price decimal(15,2) NOT NULL,
  initial_stock decimal(15,2) NOT NULL,
  minimum_stock decimal(15,2) NOT NULL
);

INSERT INTO tmp_demo_kiosk_products VALUES
  ('001','KSK-AGUA-600','7501000000011','Agua natural 600 ml','Botella individual de agua purificada.','Bebidas','Índice Fresh','600 ml','PZA',7.00,18.00,80,15),
  ('002','KSK-COLA-600','7501000000028','Refresco de cola 600 ml','Refresco de cola en botella individual.','Bebidas','Índice Fresh','600 ml','PZA',15.00,28.00,60,12),
  ('003','KSK-JUGO-NAR-500','7501000000035','Jugo de naranja 500 ml','Jugo de naranja listo para beber.','Bebidas','Índice Fresh','500 ml','PZA',17.00,32.00,45,10),
  ('004','KSK-CAFE-AMER-355','7501000000042','Café americano 355 ml','Café americano preparado al momento.','Bebidas','Índice Café','355 ml','PZA',10.00,35.00,50,10),
  ('005','KSK-PAPAS-045','7501000000059','Papas clásicas 45 g','Papas fritas con sal en presentación individual.','Snacks','Índice Snacks','45 g','PZA',12.00,25.00,70,14),
  ('006','KSK-GALLETAS-060','7501000000066','Galletas de chocolate 60 g','Galletas con chispas de chocolate.','Snacks','Índice Snacks','60 g','PZA',10.00,22.00,55,10),
  ('007','KSK-GRANOLA-035','7501000000073','Barra de granola 35 g','Barra de avena, miel y frutos secos.','Snacks','Índice Natural','35 g','PZA',8.00,18.00,65,12),
  ('008','KSK-SANDWICH-JQ','7501000000080','Sándwich de jamón y queso','Sándwich fresco empacado individualmente.','Alimentos','Índice Fresh','1 pieza','PZA',34.00,65.00,30,8),
  ('009','KSK-HELADO-VAI-120','7501000000097','Helado de vainilla 120 ml','Vaso individual de helado de vainilla.','Congelados','Índice Fresh','120 ml','PZA',16.00,38.00,35,8),
  ('010','KSK-CHOCOLATE-040','7501000000103','Chocolate con leche 40 g','Barra individual de chocolate con leche.','Snacks','Índice Snacks','40 g','PZA',12.00,24.00,50,10);

START TRANSACTION;

INSERT INTO sales_products
  (company_id, product_code, sku, name, description, category, type, price, cost,
   currency, tax_category, status, visibility, inventory_ready, pos_ready,
   custom_fields_json, metadata_json, created_by_user_id, updated_by_user_id, deleted_at)
SELECT
  @target_company_id,
  CONCAT('DEMO-KIOSK-', product.source_code),
  product.sku,
  product.product_name,
  product.product_description,
  product.category,
  'product',
  product.unit_price,
  product.unit_cost,
  'MXN',
  'standard',
  'active',
  'commercial',
  1,
  1,
  JSON_OBJECT(
    'barcode', product.barcode,
    'brand', product.brand,
    'presentation', product.presentation,
    'unit', product.unit_name
  ),
  JSON_OBJECT(
    'seed', 'demo-pos-kiosk-catalog-v1',
    'initialStock', product.initial_stock,
    'minimumStock', product.minimum_stock,
    'illustrativePrices', TRUE
  ),
  @target_user_id,
  @target_user_id,
  NULL
FROM tmp_demo_kiosk_products product
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
VALUES
  (@target_company_id, 'DEMO-KIOSK-WH-001', 'Almacén POS y kiosco demo', 'businessWarehouse',
   CAST(@target_unit_id AS CHAR), @target_unit_name,
   CAST(@target_business_id AS CHAR), @target_business_name,
   'Operación local', CAST(@target_user_id AS CHAR),
   (SELECT full_name FROM users WHERE id = @target_user_id),
   'Existencias de demostración para ventas y autocobro.', 'active', CURRENT_DATE,
   JSON_OBJECT('seed', 'demo-pos-kiosk-catalog-v1'),
   @target_user_id, @target_user_id, NULL)
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

SET @target_warehouse_id := (
  SELECT id
  FROM sales_inventory_warehouses
  WHERE company_id = @target_company_id
    AND warehouse_code = 'DEMO-KIOSK-WH-001'
  LIMIT 1
);

INSERT INTO sales_inventory_balances
  (company_id, balance_code, product_id, warehouse_id, warehouse_name,
   available_quantity, reserved_quantity, minimum_quantity, unit_cost, uses_inventory,
   business_unit_id, business_unit_name, business_id, business_name, last_movement_at,
   metadata_json, created_by_user_id, updated_by_user_id, deleted_at)
SELECT
  @target_company_id,
  CONCAT('DKSK-STK-', product.source_code),
  stored_product.id,
  @target_warehouse_id,
  'Almacén POS y kiosco demo',
  product.initial_stock,
  0,
  product.minimum_stock,
  product.unit_cost,
  1,
  CAST(@target_unit_id AS CHAR),
  @target_unit_name,
  CAST(@target_business_id AS CHAR),
  @target_business_name,
  CURRENT_DATE,
  JSON_OBJECT('seed', 'demo-pos-kiosk-catalog-v1', 'barcode', product.barcode),
  @target_user_id,
  @target_user_id,
  NULL
FROM tmp_demo_kiosk_products product
JOIN sales_products stored_product
  ON stored_product.company_id = @target_company_id
 AND stored_product.product_code = CONCAT('DEMO-KIOSK-', product.source_code)
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

COMMIT;

SELECT
  product.product_code,
  product.sku,
  product.name,
  product.category,
  product.price,
  product.currency,
  balance.available_quantity AS stock,
  warehouse.name AS warehouse
FROM sales_products product
JOIN sales_inventory_balances balance
  ON balance.company_id = product.company_id
 AND balance.product_id = product.id
 AND balance.warehouse_id = @target_warehouse_id
 AND balance.deleted_at IS NULL
JOIN sales_inventory_warehouses warehouse
  ON warehouse.id = balance.warehouse_id
WHERE product.company_id = @target_company_id
  AND product.product_code LIKE 'DEMO-KIOSK-%'
  AND product.deleted_at IS NULL
ORDER BY product.product_code;

DROP TEMPORARY TABLE IF EXISTS tmp_demo_kiosk_products;
