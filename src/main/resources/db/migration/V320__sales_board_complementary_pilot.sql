-- Read-only consolidation pilot. No company/user grants or billing prices are created.
INSERT INTO modules
 (slug,name,description,module_category,lifecycle_status,access_model,assignment_enabled,
  route_key,icon,badge_text,tier,sort_order,is_core,is_active)
VALUES ('sales_board','Tablero de ventas','Análisis conjunto de ventas CRM y POS, tendencias, periodos y canales.',
 'complementary','pilot','tabs',1,'sales-board','bi-bar-chart-line','Pilot','complementary',206,0,1);
