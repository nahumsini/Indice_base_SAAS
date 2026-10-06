-- Preserve superseded draft lines and the complete previous commercial snapshot.
ALTER TABLE pos_purchase_order_items ADD COLUMN superseded_at TIMESTAMP NULL;
CREATE TABLE pos_purchase_order_revisions (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT NOT NULL,
    purchase_order_id BIGINT NOT NULL,
    previous_snapshot_json JSON NOT NULL,
    changed_by_user_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_purchase_order_revisions (company_id, purchase_order_id, id),
    CONSTRAINT fk_purchase_order_revision_company FOREIGN KEY (company_id) REFERENCES companies(id),
    CONSTRAINT fk_purchase_order_revision_order FOREIGN KEY (purchase_order_id) REFERENCES pos_purchase_orders(id)
);
