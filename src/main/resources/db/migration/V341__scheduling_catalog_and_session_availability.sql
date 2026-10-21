-- Scheduling owns booking settings; product and employee identity remain with their owners.
ALTER TABLE scheduling_services ADD COLUMN product_id BIGINT NULL,
 ADD UNIQUE KEY uq_scheduling_service_product (company_id,product_id);
ALTER TABLE scheduling_staff ADD COLUMN buffer_minutes INT NOT NULL DEFAULT 0,
 ADD CONSTRAINT ck_scheduling_staff_buffer CHECK (buffer_minutes BETWEEN 0 AND 120);
CREATE TABLE scheduling_service_availability (
 company_id BIGINT NOT NULL, service_id BIGINT NOT NULL, day_of_week INT NOT NULL,
 start_time TIME NOT NULL, end_time TIME NOT NULL,
 PRIMARY KEY (company_id,service_id,day_of_week,start_time),
 CONSTRAINT fk_scheduling_service_hours FOREIGN KEY (company_id,service_id)
 REFERENCES scheduling_services(company_id,id),
 CONSTRAINT ck_scheduling_service_hours CHECK (day_of_week BETWEEN 1 AND 7 AND start_time<end_time)
);
CREATE TABLE scheduling_client_capture_replays (
 company_id BIGINT NOT NULL, actor_user_id BIGINT NOT NULL, request_key VARCHAR(80) NOT NULL,
 fingerprint CHAR(64) NOT NULL, client_id BIGINT NOT NULL,
 PRIMARY KEY(company_id,actor_user_id,request_key),
 CONSTRAINT fk_scheduling_client_capture_company FOREIGN KEY(company_id) REFERENCES companies(id)
);
