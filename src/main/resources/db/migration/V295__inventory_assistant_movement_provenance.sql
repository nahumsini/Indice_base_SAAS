-- Trusted Inventory owner provenance. Public compatibility metadata cannot authorize a reversal.
CREATE TABLE inventory_assistant_movement_origins (
  company_id BIGINT NOT NULL,
  movement_id BIGINT NOT NULL,
  action VARCHAR(80) NOT NULL,
  snapshot_json JSON NOT NULL,
  correlation_id VARCHAR(80) NOT NULL,
  reversed_by_movement_id BIGINT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (company_id, movement_id),
  UNIQUE KEY uk_inventory_assistant_origin_movement (movement_id),
  CONSTRAINT fk_inventory_assistant_origin_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_inventory_assistant_origin_movement FOREIGN KEY (movement_id) REFERENCES sales_inventory_movements(id),
  CONSTRAINT fk_inventory_assistant_origin_reversal FOREIGN KEY (reversed_by_movement_id) REFERENCES sales_inventory_movements(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
