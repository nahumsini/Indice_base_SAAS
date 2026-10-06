CREATE TABLE pos_supplier_invoice_attachments (
  id bigint NOT NULL AUTO_INCREMENT,
  company_id bigint NOT NULL,
  invoice_id bigint NOT NULL,
  file_name varchar(180) NOT NULL,
  mime_type varchar(120) NOT NULL,
  size_bytes bigint NOT NULL,
  object_key varchar(700) NOT NULL,
  created_by_user_id bigint NOT NULL,
  created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uk_supplier_invoice_attachment_object (company_id,object_key),
  KEY idx_supplier_invoice_attachment_owner (company_id,invoice_id,id),
  CONSTRAINT fk_supplier_invoice_attachment_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_supplier_invoice_attachment_invoice FOREIGN KEY (invoice_id) REFERENCES pos_supplier_invoices(id),
  CONSTRAINT fk_supplier_invoice_attachment_creator FOREIGN KEY (created_by_user_id) REFERENCES users(id),
  CONSTRAINT chk_supplier_invoice_attachment_size CHECK (size_bytes > 0 AND size_bytes <= 10485760)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
