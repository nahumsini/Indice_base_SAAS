ALTER TABLE consulting_service_locations
  ADD COLUMN region_name VARCHAR(120) NOT NULL DEFAULT '' AFTER country_name;

UPDATE consulting_service_locations SET region_name = 'Nuevo León' WHERE location_code = 'MX-MTY';
UPDATE consulting_service_locations SET region_name = 'Querétaro' WHERE location_code = 'MX-QRO';
UPDATE consulting_service_locations SET region_name = 'Quintana Roo' WHERE location_code = 'MX-CUN';
UPDATE consulting_service_locations SET region_name = 'Ontario' WHERE location_code = 'CA-TOR';
