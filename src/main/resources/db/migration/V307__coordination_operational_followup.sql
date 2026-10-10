-- Forward-only operational completion; no release, public activation or access grants.
ALTER TABLE scheduling_availability
  DROP PRIMARY KEY, ADD PRIMARY KEY(company_id,staff_id,day_of_week,start_time);

CREATE TABLE scheduling_unavailable_dates (
 company_id BIGINT NOT NULL,
 staff_id BIGINT NOT NULL,
 unavailable_date DATE NOT NULL,
 PRIMARY KEY(company_id,staff_id,unavailable_date),
 CONSTRAINT fk_scheduling_unavailable_staff FOREIGN KEY(company_id,staff_id)
   REFERENCES scheduling_staff(company_id,id)
);
CREATE TABLE scheduling_staff_services (
 company_id BIGINT NOT NULL,
 staff_id BIGINT NOT NULL,
 service_id BIGINT NOT NULL,
 PRIMARY KEY(company_id,staff_id,service_id),
 CONSTRAINT fk_scheduling_specialty_staff FOREIGN KEY(company_id,staff_id)
   REFERENCES scheduling_staff(company_id,id),
 CONSTRAINT fk_scheduling_specialty_service FOREIGN KEY(company_id,service_id)
   REFERENCES scheduling_services(company_id,id)
);
ALTER TABLE meeting_agreements ADD COLUMN followup_enabled TINYINT(1) NOT NULL DEFAULT 1;

CREATE TABLE meeting_agreement_task_links (
 company_id BIGINT NOT NULL,
 agreement_id BIGINT NOT NULL,
 task_id BIGINT NOT NULL,
 created_by BIGINT NOT NULL,
 created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 PRIMARY KEY(company_id,agreement_id),
 UNIQUE KEY uq_meeting_task_link(company_id,task_id),
 CONSTRAINT fk_meeting_task_agreement FOREIGN KEY(company_id,agreement_id)
   REFERENCES meeting_agreements(company_id,id)
);
ALTER TABLE scheduling_reservations ADD COLUMN client_id BIGINT NULL,
 ADD INDEX idx_scheduling_client(company_id,client_id,start_at);
ALTER TABLE scheduling_events ADD COLUMN location VARCHAR(240) NOT NULL DEFAULT '';
ALTER TABLE scheduling_audit ADD COLUMN previous_start_at DATETIME(6) NULL,
 ADD COLUMN next_start_at DATETIME(6) NULL;
