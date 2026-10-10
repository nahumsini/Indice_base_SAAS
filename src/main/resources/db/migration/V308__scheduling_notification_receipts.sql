-- Durable delivery receipts prevent dismissed notices reappearing on scheduler retries.
ALTER TABLE scheduling_reservations ADD UNIQUE KEY uq_scheduling_reservation_tenant(company_id,id);
CREATE TABLE scheduling_notification_receipts (
 company_id BIGINT NOT NULL,
 reservation_id BIGINT NOT NULL,
 recipient_user_company_id BIGINT NOT NULL,
 signal_type VARCHAR(32) NOT NULL,
 signal_key VARCHAR(100) NOT NULL,
 delivered_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 PRIMARY KEY(company_id,reservation_id,recipient_user_company_id,signal_type,signal_key),
 CONSTRAINT fk_scheduling_notice_reservation FOREIGN KEY(company_id,reservation_id)
   REFERENCES scheduling_reservations(company_id,id)
);
