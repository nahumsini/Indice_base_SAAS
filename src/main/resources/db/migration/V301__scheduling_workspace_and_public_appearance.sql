-- Forward expansion: history is retained; no grants, prices or functional records are changed.
ALTER TABLE scheduling_reservations
 ADD COLUMN paused_from_status VARCHAR(24) NULL,
 ADD COLUMN archived_at DATETIME(6) NULL,
 MODIFY COLUMN active_event_attendee VARCHAR(240) GENERATED ALWAYS AS
  (CASE WHEN status IN ('REQUESTED','CONFIRMED','PAUSED') AND archived_at IS NULL THEN attendee_email ELSE NULL END) STORED;

ALTER TABLE scheduling_pages
 ADD COLUMN brand_name VARCHAR(120) NOT NULL DEFAULT '',
 ADD COLUMN accent_color VARCHAR(7) NOT NULL DEFAULT '#2563EB',
 ADD COLUMN surface_color VARCHAR(7) NOT NULL DEFAULT '#F8FAFC',
 ADD COLUMN button_label VARCHAR(80) NOT NULL DEFAULT '',
 ADD COLUMN display_layout VARCHAR(24) NOT NULL DEFAULT 'cards';

ALTER TABLE scheduling_audit
 ADD COLUMN reason VARCHAR(500) NOT NULL DEFAULT '',
 ADD COLUMN previous_staff_id BIGINT NULL,
 ADD COLUMN next_staff_id BIGINT NULL;
