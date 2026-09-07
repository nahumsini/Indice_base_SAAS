ALTER TABLE pos_inventory_receipts
  ADD COLUMN idempotency_key varchar(100) DEFAULT NULL AFTER receipt_number,
  ADD UNIQUE KEY uk_pos_inventory_receipts_company_idempotency (company_id, idempotency_key);

CREATE TABLE pos_inventory_receipt_attachments (
  id bigint NOT NULL AUTO_INCREMENT,
  company_id bigint NOT NULL,
  receipt_id bigint NOT NULL,
  object_key varchar(700) NOT NULL,
  file_name varchar(255) NOT NULL,
  content_type varchar(120) NOT NULL,
  size_bytes bigint NOT NULL,
  created_by_user_id bigint NOT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_pos_inventory_receipt_attachment_object (company_id, object_key),
  KEY idx_pos_inventory_receipt_attachment_receipt (company_id, receipt_id, created_at),
  CONSTRAINT fk_pos_inventory_receipt_attachment_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_pos_inventory_receipt_attachment_receipt FOREIGN KEY (receipt_id) REFERENCES pos_inventory_receipts(id) ON DELETE CASCADE,
  CONSTRAINT fk_pos_inventory_receipt_attachment_user FOREIGN KEY (created_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
