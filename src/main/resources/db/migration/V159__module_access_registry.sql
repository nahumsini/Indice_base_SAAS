ALTER TABLE modules
  ADD COLUMN module_category VARCHAR(30) NOT NULL DEFAULT 'complementary' AFTER description,
  ADD COLUMN lifecycle_status VARCHAR(30) NOT NULL DEFAULT 'released' AFTER module_category,
  ADD COLUMN access_model VARCHAR(20) NOT NULL DEFAULT 'module' AFTER lifecycle_status,
  ADD COLUMN assignment_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER access_model,
  ADD COLUMN route_key VARCHAR(80) NULL AFTER assignment_enabled;

UPDATE modules
SET module_category = CASE
      WHEN slug IN (
        'config_center', 'human_resources', 'processes', 'expenses', 'petty_cash',
        'crm', 'sales', 'pos', 'inventory', 'receivables', 'kpis'
      ) THEN 'basic'
      WHEN slug IN ('agente_ventas', 'indice_analitica', 'capacitacion', 'coach') THEN 'ai'
      ELSE 'complementary'
    END,
    lifecycle_status = 'released',
    assignment_enabled = 1,
    access_model = CASE
      WHEN slug IN (
        'config_center', 'human_resources', 'processes', 'expenses', 'petty_cash',
        'crm', 'sales', 'pos', 'inventory', 'receivables', 'kpis'
      ) THEN 'tabs'
      ELSE 'module'
    END,
    route_key = CASE slug
      WHEN 'config_center' THEN 'home-panel'
      WHEN 'human_resources' THEN 'human-resources'
      WHEN 'processes' THEN 'processes-tasks'
      WHEN 'expenses' THEN 'expenses'
      WHEN 'petty_cash' THEN 'petty-cash'
      WHEN 'crm' THEN 'sales'
      WHEN 'sales' THEN 'sales'
      WHEN 'pos' THEN 'point-of-sale'
      WHEN 'inventory' THEN 'inventory'
      WHEN 'receivables' THEN 'receivables'
      WHEN 'kpis' THEN 'kpis'
      WHEN 'maintenance' THEN 'maintenance'
      ELSE route_key
    END;

INSERT INTO modules
  (slug, name, description, module_category, lifecycle_status, access_model,
   assignment_enabled, route_key, icon, badge_text, tier, sort_order, is_core, is_active)
VALUES
  ('control_minutas', 'Control de minutas', 'Seguimiento de acuerdos, responsables y compromisos.', 'complementary', 'planned', 'module', 0, 'minutes-control', 'bi-journal-check', 'Próximamente', 'complementary', 210, 0, 1),
  ('cleaning', 'Limpieza', 'Operación y control de servicios de limpieza.', 'complementary', 'planned', 'module', 0, 'cleaning', 'bi-stars', 'Próximamente', 'complementary', 220, 0, 1),
  ('lavanderia', 'Lavandería', 'Operación y trazabilidad de servicios de lavandería.', 'complementary', 'planned', 'module', 0, 'laundry', 'bi-basket', 'Próximamente', 'complementary', 230, 0, 1),
  ('transportacion', 'Transportación', 'Planeación y control de servicios de transportación.', 'complementary', 'planned', 'module', 0, 'transportation', 'bi-truck', 'Próximamente', 'complementary', 240, 0, 1),
  ('vehiculos_maquinaria', 'Vehículos y maquinaria', 'Control operativo de vehículos, maquinaria y equipos.', 'complementary', 'planned', 'module', 0, 'vehicles-machinery', 'bi-cone-striped', 'Próximamente', 'complementary', 250, 0, 1),
  ('inmuebles', 'Inmuebles', 'Administración operativa de propiedades e instalaciones.', 'complementary', 'planned', 'module', 0, 'properties', 'bi-buildings', 'Próximamente', 'complementary', 260, 0, 1),
  ('formularios', 'Formularios', 'Captura estructurada y seguimiento de formularios.', 'complementary', 'planned', 'module', 0, 'forms', 'bi-ui-checks', 'Próximamente', 'complementary', 270, 0, 1),
  ('facturacion', 'Facturación', 'Emisión y control operativo de facturación.', 'complementary', 'planned', 'module', 0, 'invoicing', 'bi-receipt', 'Próximamente', 'complementary', 280, 0, 1),
  ('correo', 'Correo electrónico', 'Comunicación empresarial conectada al sistema.', 'complementary', 'planned', 'module', 0, 'email', 'bi-envelope', 'Próximamente', 'complementary', 290, 0, 1),
  ('clima_laboral', 'Clima laboral', 'Medición y seguimiento de la experiencia del equipo.', 'complementary', 'planned', 'module', 0, 'work-climate', 'bi-thermometer-sun', 'Próximamente', 'complementary', 300, 0, 1),
  ('affiliates', 'Afiliados', 'Gestión de afiliados, relaciones y resultados.', 'complementary', 'planned', 'module', 0, 'affiliate-management', 'bi-people', 'Próximamente', 'complementary', 310, 0, 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  module_category = VALUES(module_category),
  route_key = VALUES(route_key),
  access_model = CASE
    WHEN modules.assignment_enabled = 1 THEN modules.access_model
    ELSE VALUES(access_model)
  END,
  lifecycle_status = CASE
    WHEN modules.assignment_enabled = 1 THEN modules.lifecycle_status
    ELSE VALUES(lifecycle_status)
  END,
  assignment_enabled = modules.assignment_enabled,
  is_active = 1;

CREATE INDEX idx_modules_access_registry
  ON modules (module_category, lifecycle_status, assignment_enabled, is_active, sort_order);
