CREATE TABLE maintenance_notification_receipts (
 company_id BIGINT NOT NULL,order_id BIGINT NOT NULL,recipient_user_company_id BIGINT NOT NULL,
 event_type VARCHAR(40) NOT NULL,event_key VARCHAR(100) NOT NULL,
 created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 PRIMARY KEY(company_id,order_id,recipient_user_company_id,event_type,event_key),
 CONSTRAINT fk_maintenance_notification_order FOREIGN KEY(company_id,order_id) REFERENCES maintenance_orders(company_id,id)
);
