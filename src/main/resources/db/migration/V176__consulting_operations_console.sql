ALTER TABLE consulting_appointments
  ADD COLUMN consultation_mode VARCHAR(24) NOT NULL DEFAULT 'VIRTUAL' AFTER duration_minutes,
  ADD COLUMN country_code CHAR(2) NULL AFTER consultation_mode,
  ADD COLUMN service_location_code VARCHAR(48) NULL AFTER country_code,
  ADD COLUMN service_location_name VARCHAR(120) NULL AFTER service_location_code,
  ADD COLUMN consultant_name VARCHAR(160) NULL AFTER meeting_url,
  ADD COLUMN consultant_email VARCHAR(190) NULL AFTER consultant_name,
  ADD COLUMN consultant_phone VARCHAR(40) NULL AFTER consultant_email,
  ADD COLUMN internal_notes VARCHAR(2000) NULL AFTER consultant_phone,
  ADD COLUMN confirmed_at TIMESTAMP(6) NULL AFTER internal_notes,
  ADD COLUMN completed_at TIMESTAMP(6) NULL AFTER confirmed_at,
  ADD COLUMN admin_updated_by_user_id BIGINT NULL AFTER completed_at,
  ADD KEY idx_consulting_appointments_mode_location (consultation_mode, country_code, service_location_code),
  ADD KEY idx_consulting_appointments_confirmed (status, confirmed_start_at),
  ADD CONSTRAINT fk_consulting_appointments_admin_user
    FOREIGN KEY (admin_updated_by_user_id) REFERENCES users (id) ON DELETE SET NULL;

CREATE TABLE consulting_service_locations (
  id BIGINT NOT NULL AUTO_INCREMENT,
  location_code VARCHAR(48) NOT NULL,
  country_code CHAR(2) NOT NULL,
  country_name VARCHAR(80) NOT NULL,
  city_name VARCHAR(120) NOT NULL,
  timezone VARCHAR(80) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  in_person_fee_cents BIGINT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  sort_order INT NOT NULL DEFAULT 100,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_consulting_service_locations_code (location_code),
  KEY idx_consulting_service_locations_country (country_code, active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO consulting_service_locations
  (location_code, country_code, country_name, city_name, timezone, active, in_person_fee_cents, currency, sort_order)
VALUES
  ('MX-MTY', 'MX', 'México', 'Monterrey', 'America/Monterrey', 1, NULL, 'USD', 10),
  ('MX-QRO', 'MX', 'México', 'Querétaro', 'America/Mexico_City', 1, NULL, 'USD', 20),
  ('MX-CUN', 'MX', 'México', 'Cancún', 'America/Cancun', 1, NULL, 'USD', 30),
  ('CA-TOR', 'CA', 'Canadá', 'Toronto', 'America/Toronto', 1, NULL, 'USD', 40);
