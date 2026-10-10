CREATE TABLE maintenance_technicians (
 company_id BIGINT NOT NULL,user_id BIGINT NOT NULL,specialties JSON NOT NULL,
 active BOOLEAN NOT NULL DEFAULT TRUE,version BIGINT NOT NULL DEFAULT 1,
 PRIMARY KEY(company_id,user_id),
 CONSTRAINT fk_maintenance_technician_company FOREIGN KEY(company_id) REFERENCES companies(id),
 CONSTRAINT fk_maintenance_technician_user FOREIGN KEY(user_id) REFERENCES users(id)
);
