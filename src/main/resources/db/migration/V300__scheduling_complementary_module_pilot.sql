INSERT INTO modules
 (slug,name,description,module_category,lifecycle_status,access_model,assignment_enabled,
  route_key,icon,badge_text,tier,sort_order,is_core,is_active)
VALUES ('scheduling','Agenda y eventos','Servicios, disponibilidad, reservas y eventos públicos.',
 'complementary','pilot','tabs',1,'scheduling','bi-calendar-event','Pilot','complementary',205,0,1);

-- Registration intentionally creates no entitlements, user assignments or billing prices.
CREATE TABLE scheduling_services (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 company_id BIGINT NOT NULL,
 name VARCHAR(180) NOT NULL,
 description VARCHAR(1500) NOT NULL DEFAULT '',
 duration_minutes INT NOT NULL,
 buffer_minutes INT NOT NULL,
 notice_hours INT NOT NULL,
 active TINYINT(1) NOT NULL DEFAULT 1,
 version BIGINT NOT NULL DEFAULT 1,
 created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 UNIQUE KEY uq_scheduling_service_tenant (company_id,id),
 CONSTRAINT fk_scheduling_service_company FOREIGN KEY (company_id) REFERENCES companies(id)
);
CREATE TABLE scheduling_staff (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 company_id BIGINT NOT NULL,
 user_id BIGINT NOT NULL,
 public_name VARCHAR(180) NOT NULL,
 timezone VARCHAR(80) NOT NULL,
 active TINYINT(1) NOT NULL DEFAULT 1,
 version BIGINT NOT NULL DEFAULT 1,
 UNIQUE KEY uq_scheduling_staff_user (company_id,user_id),
 UNIQUE KEY uq_scheduling_staff_tenant (company_id,id),
 CONSTRAINT fk_scheduling_staff_company FOREIGN KEY (company_id) REFERENCES companies(id),
 CONSTRAINT fk_scheduling_staff_user FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE scheduling_availability (
 company_id BIGINT NOT NULL,
 staff_id BIGINT NOT NULL,
 day_of_week INT NOT NULL,
 start_time TIME NOT NULL,
 end_time TIME NOT NULL,
 PRIMARY KEY (company_id,staff_id,day_of_week),
 CONSTRAINT fk_scheduling_availability_staff FOREIGN KEY (company_id,staff_id)
  REFERENCES scheduling_staff(company_id,id)
);
CREATE TABLE scheduling_pages (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 company_id BIGINT NOT NULL,
 alias VARCHAR(80) NOT NULL,
 title VARCHAR(180) NOT NULL,
 description VARCHAR(1500) NOT NULL DEFAULT '',
 published TINYINT(1) NOT NULL DEFAULT 0,
 protected_token TEXT NOT NULL,
 version BIGINT NOT NULL DEFAULT 1,
 UNIQUE KEY uq_scheduling_page_company (company_id),
 UNIQUE KEY uq_scheduling_page_alias (alias),
 CONSTRAINT fk_scheduling_page_company FOREIGN KEY (company_id) REFERENCES companies(id)
);
CREATE TABLE scheduling_events (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 company_id BIGINT NOT NULL,
 staff_id BIGINT NOT NULL,
 title VARCHAR(180) NOT NULL,
 description VARCHAR(1500) NOT NULL DEFAULT '',
 start_at DATETIME(6) NOT NULL,
 duration_minutes INT NOT NULL,
 capacity INT NOT NULL,
 published TINYINT(1) NOT NULL DEFAULT 0,
 status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE',
 version BIGINT NOT NULL DEFAULT 1,
 UNIQUE KEY uq_scheduling_event_tenant (company_id,id),
 KEY idx_scheduling_event_date (company_id,start_at),
 CONSTRAINT fk_scheduling_event_staff FOREIGN KEY (company_id,staff_id)
  REFERENCES scheduling_staff(company_id,id)
);
CREATE TABLE scheduling_reservations (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 company_id BIGINT NOT NULL,
 staff_id BIGINT NOT NULL,
 service_id BIGINT NULL,
 event_id BIGINT NULL,
 reference VARCHAR(40) NOT NULL,
 attendee_name VARCHAR(180) NOT NULL,
 attendee_email VARCHAR(240) NOT NULL,
 active_event_attendee VARCHAR(240) GENERATED ALWAYS AS
  (CASE WHEN status IN ('REQUESTED','CONFIRMED') THEN attendee_email ELSE NULL END) STORED,
 attendee_company VARCHAR(180) NOT NULL DEFAULT '',
 attendee_phone VARCHAR(40) NOT NULL DEFAULT '',
 start_at DATETIME(6) NOT NULL,
 duration_minutes INT NOT NULL,
 buffer_minutes INT NOT NULL,
 status VARCHAR(24) NOT NULL DEFAULT 'REQUESTED',
 consent_at DATETIME(6) NOT NULL,
 reason VARCHAR(500) NOT NULL DEFAULT '',
 version BIGINT NOT NULL DEFAULT 1,
 created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 UNIQUE KEY uq_scheduling_reference (reference),
 UNIQUE KEY uq_scheduling_event_attendee (company_id,event_id,active_event_attendee),
 KEY idx_scheduling_reservation_date (company_id,start_at,status),
 CONSTRAINT fk_scheduling_reservation_staff FOREIGN KEY (company_id,staff_id)
  REFERENCES scheduling_staff(company_id,id),
 CONSTRAINT fk_scheduling_reservation_service FOREIGN KEY (company_id,service_id)
  REFERENCES scheduling_services(company_id,id),
 CONSTRAINT fk_scheduling_reservation_event FOREIGN KEY (company_id,event_id)
  REFERENCES scheduling_events(company_id,id)
);
CREATE TABLE scheduling_audit (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 company_id BIGINT NOT NULL,
 actor_user_id BIGINT NULL,
 entity_type VARCHAR(40) NOT NULL,
 entity_id BIGINT NOT NULL,
 action VARCHAR(60) NOT NULL,
 created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 KEY idx_scheduling_audit_company (company_id,created_at),
 CONSTRAINT fk_scheduling_audit_company FOREIGN KEY (company_id) REFERENCES companies(id)
);
-- Shared technical resource lock contains no recoverable identity or business data.
CREATE TABLE scheduling_resource_mutex (
 resource_hash CHAR(64) NOT NULL PRIMARY KEY
);
CREATE TABLE scheduling_capture_replays (
 company_id BIGINT NOT NULL,
 actor_user_id BIGINT NOT NULL,
 request_key CHAR(64) NOT NULL,
 request_fingerprint CHAR(64) NOT NULL,
 reference VARCHAR(40) NOT NULL,
 response_status VARCHAR(24) NOT NULL,
 PRIMARY KEY (company_id,actor_user_id,request_key),
 CONSTRAINT fk_scheduling_capture_company FOREIGN KEY (company_id) REFERENCES companies(id)
);
